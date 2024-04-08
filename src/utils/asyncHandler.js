const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.log(error?.message);
    res.status(error.statusCode || 500).json({
      error: error,
    });
  }
};

export default asyncHandler;
