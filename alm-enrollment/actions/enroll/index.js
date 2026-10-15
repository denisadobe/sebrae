/*
 * enroll — consumer of the Adobe Commerce "order placed" event (Adobe I/O Events).
 * For every ordered product with an ALM course id (product attribute), makes sure the
 * customer exists in Adobe Learning Manager and enrolls them in the course.
 * Non-2xx responses make I/O Events retry the delivery; enrollment is idempotent.
 *
 * Event payload: params.data.value = order with customer_email, customer_firstname,
 * customer_lastname, increment_id and items[].sku (fields of the event subscription).
 */
const alm = require('../alm.js');
const commerce = require('../commerce.js');

const response = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body });

/** Order of the event (I/O Events delivery) or of a direct test call ({ order }). */
function getOrder(params) {
  return params.data?.value || params.order || null;
}

function getSkus(order) {
  const items = Array.isArray(order.items) ? order.items : Object.values(order.items || {});
  // child items of configurables repeat the parent SKU; keep unique SKUs
  return [...new Set(items.map((item) => item?.sku).filter(Boolean))];
}

async function main(params) {
  const order = getOrder(params);
  if (!order) return response(400, { error: 'no order in the event' });
  const email = order.customer_email;
  if (!email) return response(400, { error: 'order without customer e-mail', order: order.increment_id });
  const name = [order.customer_firstname, order.customer_lastname].filter(Boolean).join(' ') || email;

  try {
    const courseIds = await commerce.getCourseIds(params, getSkus(order));
    const courses = [...new Set(Object.values(courseIds).map(alm.toLoId).filter(Boolean))];
    if (!courses.length) return response(200, { order: order.increment_id, enrolled: [], info: 'no course in the order' });

    const adminToken = await alm.getAdminToken(params);
    const userId = await alm.findOrCreateUser(params, adminToken, { email, name });
    const enrolled = [];
    // sequential: few courses per order, and ALM rate limits
    // eslint-disable-next-line no-restricted-syntax
    for (const loId of courses) {
      // eslint-disable-next-line no-await-in-loop
      enrolled.push(await alm.enroll(params, adminToken, userId, loId));
    }
    return response(200, { order: order.increment_id, userId, enrolled });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('enroll failed', order.increment_id, error.message, JSON.stringify(error.body || error.errors || {}));
    return response(500, { error: error.message, order: order.increment_id });
  }
}

module.exports = { main, getOrder, getSkus };
