'use strict'

const protoLoader = require('@grpc/proto-loader')
const grpc = require('../proxy/grpc')
const logger = require('../logger')

class GrpcConnection {
  connectSpans(endpoint, license_key, run_id) {
    const packageDefinition = protoLoader.loadSync(
      __dirname + '../../../lib/grpc/endpoints/infinite-tracing/v1.proto',
      {keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
      })

    const mtb = grpc.loadPackageDefinition(packageDefinition).com.monisagent.trace.v1
    const client = new mtb.IngestService(
      endpoint,
      grpc.credentials.createSsl()
    )
    const metadata = new grpc.Metadata()

    metadata.add('license_key', license_key)
    metadata.add('agent_run_token', run_id)
    const stream = client.recordSpan(metadata)

    if (logger.traceEnabled()) {
      stream.on('data', function data(response) {
        logger.trace("grpc span response stream: %s", JSON.stringify(response))
      })
    }
    return stream
  }
}
module.exports = GrpcConnection
