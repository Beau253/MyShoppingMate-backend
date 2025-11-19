
// Mount auth routes
app.use('/auth', authRoutes);

const startServer = () => {
  app.listen(config.port, () => {
    console.log(`Auth service running on port ${config.port}`);
  });
};

startServer();