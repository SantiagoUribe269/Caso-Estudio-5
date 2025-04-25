const { Kafka } = require('kafkajs');
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(bodyParser.json());

// Configuración de Kafka
const kafka = new Kafka({
  clientId: 'pedidos-service',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();

// Endpoint para crear pedidos
app.post('/pedidos', async (req, res) => {
  try {
    const pedido = {
      id: uuidv4(),
      clienteId: req.body.clienteId,
      productos: req.body.productos,
      fecha: new Date().toISOString()
    };

    // Conectar el productor de Kafka
    await producer.connect();
    
    // Publicar evento PedidoCreado
    await producer.send({
      topic: 'PedidoCreado',
      messages: [
        { value: JSON.stringify(pedido) }
      ]
    });

    // Desconectar el productor
    await producer.disconnect();

    res.status(201).json({
      mensaje: 'Pedido creado exitosamente',
      pedidoId: pedido.id
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al crear el pedido' });
  }
});

// Iniciar el servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Pedidos Service corriendo en http://localhost:${PORT}`);
});