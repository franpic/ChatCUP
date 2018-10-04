'use strict'

// const WebServicesHCup = require('./it/exprivia/healthcare/cup/classi/WebServicesHCup.js')
const CodiceFiscale = require('./it/exprivia/healthcare/cup/classi/Dati/CodiceFiscale.js')
// const NumeroRicettaElettronica = require('./it/exprivia/healthcare/cup/classi/Dati/NumeroRicettaElettronica')
const Consultazione = require('./it/exprivia/healthcare/cup/classi/Consultazione.js')

async function main () {
  const varConsultazione = new Consultazione()
  //  const varWebServicesHCup = new WebServicesHCup()
  // const listaAppuntamenti = await varConsultazione.popolaListaEsami()
  console.log(JSON.stringify(varConsultazione._ultimiEsamiEstrattiDaRicetta))
}

async function main () {
  var d = new CodiceFiscale()
  var t = await d._checkValore('pccfnc88c20f262p')
  console.log(t)
}

main()
