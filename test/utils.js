'use strict'

const Libp2p = require('libp2p')
const WSStar = require('libp2p-websocket-star')
const {parallel} = require('async')
const multiaddr = require('multiaddr')
const serverMa = multiaddr('/ip4/127.0.0.1/tcp/3943/ws/ipfs/QmWC64HjhUmNjCNksZZzPVhmffx1LZoGobkFx2xFini4p6')

const WS = require('libp2p-websockets')
const MULTIPLEX = require('libp2p-multiplex')
const SPDY = require('libp2p-spdy')
const SECIO = require('libp2p-secio')

const Id = require('peer-id')
const Peer = require('peer-info')

let ids = global.ids = (global.ids || {
  client: require('./idClient'),
  server: require('./idServer')
})
let infos = global.infos = (global.infos || {})

const Utils = module.exports = {
  createSwarm: (cb, attach) => {
    const next = () => {
      const peer = infos.peer
      let star = new WSStar({id: peer.id})

      const modules = {
        transport: [
          new WS()
        ],
        connection: {
          muxer: [
            MULTIPLEX,
            SPDY
          ],
          crypto: [
            SECIO
          ]
        },
        discovery: [],
        relay: {
          enabled: true,
          hop: {
            enabled: true,
            active: true // active relay
          }
        }
      }

      if (attach || attach == null) {
        modules.discovery.push(star.discovery)
        modules.transport.push(star)
      }

      let swarm = new Libp2p(modules, peer)

      star.setSwarm(swarm)

      swarm.start(err => {
        if (err) return cb(err)
        else cb(null, [swarm, star])
      })
    }

    if (!infos.peer) Utils.prepare(global.TYPE, err => err ? cb(err) : next())
    else next()
  },
  prepare: (ownID, cb) => {
    parallel(Object.keys(ids).map(id => cb => Id.createFromJSON(ids[id], (err, id_) => err ? cb(err) : cb(null, (ids[id] = id_)))), err => {
      if (err) return cb(err)
      Object.keys(ids).forEach(id => (infos[id] = new Peer(ids[id])))
      infos.client.multiaddrs.add(serverMa)
      infos.server.multiaddrs.add(serverMa.encapsulate('p2p-websocket-star'))
      infos.peer = infos[ownID]
      cb()
    })
  },
  serverMa
}