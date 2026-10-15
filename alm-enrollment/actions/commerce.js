/*
 * Adobe Commerce (as a Cloud Service) storefront GraphQL calls used by the actions:
 * the ALM course id of products (Catalog Service attribute) and the signed-in customer
 * behind a customer token.
 */

async function graphql(params, query, variables = {}, headers = {}) {
  const resp = await fetch(params.COMMERCE_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Store: params.COMMERCE_STORE_VIEW_CODE || 'default',
      'Magento-Store-Code': params.COMMERCE_STORE_CODE || 'main_website_store',
      'Magento-Store-View-Code': params.COMMERCE_STORE_VIEW_CODE || 'default',
      'Magento-Website-Code': params.COMMERCE_WEBSITE_CODE || 'base',
      ...headers,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok || body.errors?.length) {
    const error = new Error(`Commerce GraphQL failed: ${body.errors?.[0]?.message || resp.status}`);
    error.status = resp.status;
    error.errors = body.errors;
    throw error;
  }
  return body.data;
}

/**
 * ALM course id per SKU, from the product attribute (default alm_course_id). The attribute
 * must be visible on the storefront so Catalog Service returns it.
 * @returns {Promise<Object<string, string>>} sku -> attribute value (SKUs without a value omitted)
 */
async function getCourseIds(params, skus) {
  if (!skus.length) return {};
  const attribute = params.ALM_COURSE_ATTRIBUTE || 'alm_course_id';
  const data = await graphql(params, `query ($skus: [String]) {
    products(skus: $skus) { sku attributes(roles: []) { name value } }
  }`, { skus });
  return Object.fromEntries((data.products || [])
    .map((p) => [p.sku, p.attributes?.find((a) => a.name === attribute)?.value])
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim()));
}

/** Customer of a customer token (Authorization: Bearer), or null when the token is invalid. */
async function getCustomer(params, customerToken) {
  try {
    const data = await graphql(params, '{ customer { email firstname lastname } }', {}, {
      Authorization: `Bearer ${customerToken}`,
    });
    return data.customer?.email ? data.customer : null;
  } catch (error) {
    if (error.errors?.some((e) => e.extensions?.category === 'graphql-authorization') || error.status === 401) return null;
    throw error;
  }
}

module.exports = { graphql, getCourseIds, getCustomer };
