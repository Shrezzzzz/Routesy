import app from './app';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

app.listen(PORT, () => {
  console.info(`Routesy API listening on port ${PORT}`);
});
