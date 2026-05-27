import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: {
    title: 'Walter API',
    description: 'API de Walter'
  },
  host: 'localhost:3000',
  schemes: ['http']
};

const outputFile = './swagger-output.json';
const routes = ['./src/index.js'];

swaggerAutogen()(outputFile, routes, doc);