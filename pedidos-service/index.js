const { Kafka } = require('kafkajs');
const express = require('express');
const app = express();
app.use(express.json());

const kafka = new Kafka({
  clientId: 'pedidos-service',
  brokers: ['localhost:9092'] // Kafka local
});

const producer = kafka.producer();

app.post('/pedidos', async (req, res) => {
  const { productos } = req.body;
  const pedidoId = `PED-${Date.now()}`;

  try {
    await producer.connect();
    await producer.send({
      topic: 'pedido-creado',
      messages: [{ value: JSON.stringify({ pedidoId, productos }) }],
    });
    res.json({ mensaje: 'Pedido creado!', pedidoId });
  } catch (err) {
    console.error('Error al publicar:', err);
    res.status(500).json({ error: 'Error en Kafka' });
  }
});

app.listen(3000, () => {
  console.log('PedidosService en http://localhost:3000');
});