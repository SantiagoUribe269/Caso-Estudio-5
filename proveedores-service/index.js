const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'proveedores-service',
  brokers: ['localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'proveedores-group' });

const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'pedido-creado', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const { pedidoId, productos } = JSON.parse(message.value.toString());
      console.log(`📦 Pedido ${pedidoId}: Reservando stock para`, productos);
    },
  });
};

run().catch(console.error);