/**
 * @todo Implementare i corrispettivi testuali delle quick_eplies richiedendo solo le quickreplies se il testo è sbagliato
 * @todo Gestire concorrenza delle consultazioni
 *
 */

 
/**
 * Gestisce la conversazione con un utente
 *
 * @author Francesco Piccolomini
 *
 * @method _chiediProssimoDato
 * @todo Finire questa presentazione con la lista dei metodi
 */

'use strict'

const request = require('request')
const express = require('express')
const bodyParser = require('body-parser')
const app = express().use(bodyParser.json())

const Consultazione = require('./it/exprivia/healthcare/cup/classi/Consultazione.js')

var varConsultazioni = {}
const ENUM_TIPO_INPUT_UTENTE = Object.freeze({
  TEXT: 'text',
  QUICK_REPLY: 'quick_reply'
})
var tipoDatoAtteso = ENUM_TIPO_INPUT_UTENTE.TEXT

// Imposta il server in ascolto su una porta e scrive il log in caso di successo
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'))

// Accetta le richieste GET fatte alla rotta /webhook
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN

  // Analizza i parametri della richiesta di verifica del webhook
  let mode = req.query['hub.mode']
  let token = req.query['hub.verify_token']
  let challenge = req.query['hub.challenge']

  // Controlla se token e mode sono stati inviati
  if (mode && token) {
    // Controlla se token e mode inviati sono corretti
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // Risponde con '200 OK' ed il token di ingaggio preso dalla richiesta
      console.log('WEBHOOK_VERIFIED')
      res.status(200).send(challenge)
    } else {
      // Risponde con '403 Forbidden' se i token di verifica non corrispondono
      res.sendStatus(403)
    }
  }
})

// Accetta le richieste GET fatte alla rotta /webhook
app.get('/NormativaPrivacy', (req, res) => {
  res.status(200).send('https://github.com/franpic/ChatCUP/blob/master/informativaPrivacy.doc')
})

// Accetta le richieste POST fatte alla rotta /webhook
app.post('/webhook', (req, res) => {
  // Analizza il corpo della richiesta POST
  let body = req.body

  // Controlla che l'evento sul webhook sia generato da una pagina
  if (body.object === 'page') {
    // Itera attraverso ogni inserimento - potrebbero esseree multipli se programmati
    body.entry.forEach(function (entry) {
      // Recupera il corpo dell'evento sul webhook
      let webhookEvent = entry.messaging[0]

      // Recupera il PSID del mittente
      let senderPsid = webhookEvent.sender.id

      // Controlla se l'evento è un messaggio o un postback e
      // lo passa alla funzione di gestione appropriata
      if (webhookEvent.message) {
        handleMessage(senderPsid, webhookEvent.message)
      } else if (webhookEvent.postback) {
        handlePostback(senderPsid, webhookEvent.postback)
      }
    })

    // Restituisce una risposta '200 OK' a tutti gli eventi
    res.status(200).send('EVENT_RECEIVED')
  } else {
    // Restituisce una risposta '404 Not Found' se l'evento non proviene da una pagina
    res.sendStatus(404)
  }
})

/**
 * Chiede il prossimo dato usando l'api Send di Facebook
 * @param {String} senderPsid L'id Facebook di chi sta chattando con il bot
 *
 * @returns {Boolean} true se viene chiesto un prossimo dato, false altrimenti
 */
function _chiediProssimoDato (senderPsid) {
  var risposta

  // Se c'è, chiede il prossimo dato mancante
  if (varConsultazioni[senderPsid]['consultazione'].hasProssimoDatoDaChiedere() === true) {
    risposta = {
      'attachment': {
        'type': 'template',
        'payload': {
          'template_type': 'generic',
          'elements': [
            {
              'title': varConsultazioni[senderPsid]['consultazione'].getFraseRichiestaProssimoDato(),
              'image_url': varConsultazioni[senderPsid]['consultazione'].getUrlImmagineProssimoDato()
            }
          ]
        }
      }
    }
    callSendAPI(senderPsid, risposta)
    tipoDatoAtteso = ENUM_TIPO_INPUT_UTENTE.TEXT
    return true
  } else {
    return false
  }
}

/**
 * Restituisce il nome dell'utente che sta parlando con il bot, partendo dallo Psid
 * @param {String} senderPsid lo psid dell'utente
 *
 * @returns {String, null} il nome dell'utente oppure null
 */
function _getNomeDaPsid (senderPsid) {
  console.log('Entrato in _getNomeDaPsid')
  return new Promise((resolve, reject) => {
    request('https://graph.facebook.com/' + senderPsid + '?fields=first_name&access_token=EAAIPW5aOST0BAF6lyJNV1K1H2ska9HVgRqs2iWq4hJPuyCCESaBpLeK1OkqnZBN8hFfsHI5HNJGfYNzQyXcIaTvt1dMXECLrfa2uryqgK0jgWXUnye47SnbhKiacXY3IiKNWaOFdWdLnlwFPrrL2DVI17uahynlxxR2DNUwZDZD', function (error, response, body) {
      if (error) {
        console.log('error:', error) // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode) // Print the response status code if a response was received
        console.log('body:', body)
        reject(new Error(null))
      } else {
        console.log(JSON.parse(body)['first_name'])
        resolve(JSON.parse(body)['first_name'])
      }
    })
  })
    .catch((errore) => {
      return null
    })
}

/**
 * Gestisce gli eventi dei messaggi
 * @param {*} senderPsid L'id Facebook di chi sta chattando con il bot
 * @param {*} receivedMessage Il messaggio ricevuto dall'utente
 */
async function handleMessage (senderPsid, receivedMessage) {
  var risposta
  var isDatoDaChiedere = true
  const S_MESSAGGIO_TIPO_INPUT = 'Mi spiace ma non ho capito.'

  console.log('messaggioRicevuto: ' + JSON.stringify(receivedMessage))

  // Controlla se il messaggio proviene da una quick_reply
  if (receivedMessage.quick_reply) {
    console.log('Ricevuta una quick reply')
    if (tipoDatoAtteso === ENUM_TIPO_INPUT_UTENTE.QUICK_REPLY) {
      // Recupera il payload della quick_reply
      let payload = receivedMessage.quick_reply.payload

      varConsultazioni[senderPsid]['consultazione'].setValoreInDato(payload)
      tipoDatoAtteso = ENUM_TIPO_INPUT_UTENTE.TEXT
    } else {
      console.log('Non mi aspettavo una quick reply')
      risposta = {
        'text': S_MESSAGGIO_TIPO_INPUT + ' In questo momento mi aspetto che tu tocchi una delle risposte rapide che ti ho mostrato'
      }
      callSendAPI(senderPsid, risposta)
    }
  } else {
    if (receivedMessage.attachments) {
      console.log('Ricevuto un allegato')

      // Recupera l'url dell'allegato
      let attachmentUrl = receivedMessage.attachments[0].payload.url
      let risposteRapide = []

      // Uso il servizio azure per riconoscere il testo nelle foto
      varConsultazioni[senderPsid]['ultimiValoriRiconosciuti'] = await varConsultazioni[senderPsid]['consultazione'].getPossibiliValoriDaImmagine(attachmentUrl)
      console.log('valoriRiconosciutiInImmagine: ' + varConsultazioni[senderPsid]['ultimiValoriRiconosciuti'])
      if (varConsultazioni[senderPsid]['ultimiValoriRiconosciuti'] !== null) {
        for (var valorePotenziale of varConsultazioni[senderPsid]['ultimiValoriRiconosciuti']) {
          risposteRapide.push({
            content_type: 'text',
            title: valorePotenziale,
            payload: valorePotenziale
          })
        }

        risposta = {
          text: 'Nell\'immagine ho riconosciuto i seguenti possibili valori ' + varConsultazioni[senderPsid]['consultazione'].getProssimaProposizioneArticolata() + ' ' + varConsultazioni[senderPsid]['consultazione'].getProssimoNomeDato() + '. Se vedi quello giusto toccalo altrimenti puoi inviarmene un\'altra foto oppure scrivermelo.',
          quick_replies: risposteRapide
        }

        tipoDatoAtteso = ENUM_TIPO_INPUT_UTENTE.QUICK_REPLY
        isDatoDaChiedere = false
      } else {
        risposta = {
          'text': 'Non ho riconosciuto ' + varConsultazioni[senderPsid]['consultazione'].getProssimoArticoloDeterminativo() + ' ' + varConsultazioni[senderPsid]['consultazione'].getProssimoNomeDato() + '. Puoi riprovare a fotografarlo oppure digitarlo?'
        }
      }
      await callSendAPI(senderPsid, risposta)
    } else if (receivedMessage.text) { // Controlla se il messaggio contiene testo
      console.log('Ricevuto un messaggio con solo testo')

      if (tipoDatoAtteso === ENUM_TIPO_INPUT_UTENTE.TEXT) {
        if (varConsultazioni[senderPsid]['consultazione'].setValoreInDato(receivedMessage.text) === false) {
          risposta = {
            'text': varConsultazioni[senderPsid]['consultazione'].getFraseFormatoDatoErrato()
          }
        }
      } else {
        console.log('Non mi aspettavo solo del testo')
        risposta = {
          'text': S_MESSAGGIO_TIPO_INPUT + ' In questo momento mi aspetto che tu mi digiti o mandi un\'immagine del dato'
        }
      }
      await callSendAPI(senderPsid, risposta)
    }
  }

  if (isDatoDaChiedere === true) {
    if (varConsultazioni[senderPsid]['consultazione'].hasProssimoDatoDaChiedere() === true) {
      _chiediProssimoDato(senderPsid)
    } else {
      var listaAppuntamenti = varConsultazioni[senderPsid]['consultazione'].getListaAppuntamenti()
      var elementi = []
      risposta = {}
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
      await callSendAPI(senderPsid, risposta)

      risposta = {
        'text': 'Hai inserito tutti i dati, grazie!'
      }
      await callSendAPI(senderPsid, risposta)

      delete varConsultazioni[senderPsid]['consultazione']
    }
  }
}

/**
 * Gestisce gli eventi messaging_postbacks
 * @param {*} senderPsid L'id facebook di chi sta chattando con il bot
 * @param {*} receivedPostback Il postback ricevuto come messaggio dall'utente
 */
async function handlePostback (senderPsid, receivedPostback) {
  console.log('Entrato in handlePostback()')
  let risposta

  // Recupera il payload del postback
  let payload = receivedPostback.payload

  // Imposta la risposta basata sul payload del postback
  switch (payload) {
    case 'inizia':
      varConsultazioni[senderPsid] = {consultazione: new Consultazione(), ultimiValoriRiconosciuti: '', ultimoMessaggio: ''}

      var sTesto = ''

      sTesto = 'Ciao ' + await _getNomeDaPsid(senderPsid)
      risposta = {
        'text': sTesto
      }
      await callSendAPI(senderPsid, risposta)

      sTesto = 'Per permetterti di consultare gli appuntamenti ho bisogno dei seguenti dati:\n' + varConsultazioni[senderPsid]['consultazione'].getListaDati()
      risposta = {
        'text': sTesto
      }
      await callSendAPI(senderPsid, risposta)
      break

    default:
      risposta = {
        'text': 'Mi spiace ma non ho capito'
      }

      await callSendAPI(senderPsid, risposta)
      break
  }

  _chiediProssimoDato(senderPsid)
}

/**
 * Invia messaggi di risposta usando l'API
 * @param {*} senderPsid L'id facebook di chi sta chattando con il bot
 *
 * @param {*} risposta La risposta da inviare all'interlocutore del bot
 */
function callSendAPI (senderPsid, risposta) {
  console.log('Entrato in CallSendApi')

  varConsultazioni[senderPsid]['ultimoMessaggio'] = risposta

  return new Promise((resolve, reject) => {
    // Costruisce il corpo del messaggio
    let requestBody = {
      'recipient': {
        'id': senderPsid
      },
      'message': risposta
    }

    // Invia la richiesta HTTP alla piattaforma messenger
    request({
      'uri': 'https://graph.facebook.com/v2.6/me/messages',
      'qs': { 'access_token': process.env.PAGE_ACCESS_TOKEN },
      'method': 'POST',
      'json': requestBody
    }, (err, res, body) => {
      if (!err) {
        console.log(body)
        console.log('message sent!')
        resolve(true)
      } else {
        console.error('Unable to send message:' + err)
        reject(new Error(false))
      }
    })
  })
    .catch(errore => {
      console.error(errore)
      return false
    })
}
