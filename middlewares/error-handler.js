export default async function(ctx, next) {
  try {
    await next();
  } catch (err) {
    ctx.status = Number.isInteger(err.status) ? err.status : 500;

    ctx.body = {
      errors: [{
        title: err.message,
        source: err.source,
        detail: err.detail,
        meta: {
          ...err.meta,
          stack: err.stack,
        },
      }],
    };
  }
}
