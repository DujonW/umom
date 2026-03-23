function success(data, message = 'OK') {
  return { success: true, message, data };
}

function error(message, code = 'INTERNAL_ERROR') {
  return { success: false, error: { code, message } };
}

function paginated(data, total, page, limit) {
  return {
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
}

module.exports = { success, error, paginated };
