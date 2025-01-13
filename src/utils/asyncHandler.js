
const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.log({error: error?.message});
    res.status(error.statusCode || 500).json({
      error: error,
    });
  }
};


export const handleSuccessResponse = (res, data, status = "Success") => {
  return res.status(200).json({
    ...data,
    isSuccess: true,
    status,
  });
};

export default asyncHandler;
