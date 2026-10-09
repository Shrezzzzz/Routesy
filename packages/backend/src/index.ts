import app from './app';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

app.listen(PORT, () => {
  console.log(`Routeora API listening on port ${PORT}`);
});
