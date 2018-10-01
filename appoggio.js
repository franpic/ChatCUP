'use strict'

const WebServicesHCup = require('./it/exprivia/healthcare/cup/classi/WebServicesHCup.js')
// const CodiceFiscale = require('./it/exprivia/healthcare/cup/classi/Dati/CodiceFiscale.js')
// const NumeroRicettaElettronica = require('./it/exprivia/healthcare/cup/classi/Dati/NumeroRicettaElettronica')
const Consultazione = require('./it/exprivia/healthcare/cup/classi/Consultazione.js')

async function main () {
  const varConsultazione = new Consultazione()
  //  const varWebServicesHCup = new WebServicesHCup()
  const listaAppuntamenti = await varConsultazione.getListaDisponibilita()
  console.log(listaAppuntamenti)

  var elementi = []
  var risposta = {}
  for (var appuntamento of listaAppuntamenti) {
    elementi.push({
      'title': appuntamento['momento'].toLocaleDateString() + ' - ' + appuntamento['momento'].toLocaleTimeString(),
      'subtitle': appuntamento['presidio']['nomePresidio'] + ' - ' + appuntamento['presidio']['localitaPresidio'],
      'buttons': [{
        'type': 'postback',
        'title': 'Prenota',
        'payload': appuntamento
      }]
    })

    risposta = {
      'payload': {
        'template_type': 'generic',
        'elements': elementi
      }
    }
  }

  console.log(risposta)
}

/* async function main () {
  var d = new CodiceFiscale()
  var t = await d.getPossibiliValoriDaImmagine('https://scontent-mxp1-1.xx.fbcdn.net/v/t1.15752-9/42435663_689329514757681_5456734195558645760_n.png?_nc_cat=110&oh=87a597a52c52d043d7cc5ed354fe439d&oe=5C1A79C5')
  console.log(await d._getValoriDaTesto(t))
} */

main()
