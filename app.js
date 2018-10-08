/**
 * @todo Implementare i corrispettivi testuali delle quick_eplies richiedendo solo le quickreplies se il testo è sbagliato
 * @todo secondo me, al momento troppo del lavoro di Consultazione al momento viene fatto da app. I due moduli al momento non sono totalmente indipendenti
 * @todo linea 277 è più giusto che la frase di ko provenga dal setValoreInDato e che quindi questo restituisca un oggetto con esito true o false e frase descrittiva
 * @todo linea 319 Il numero Coupon deve provenire da Consultazione e non essere generato quì, nel rispetto di ciò che sta venendo stubbato
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
  ATTACHMENTS: 'attachments',
  QUICK_REPLY: 'quick_reply',
  POSTBACK: 'postback'
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
      // Risponde con "200 OK" ed il token di ingaggio preso dalla richiesta
      console.log('WEBHOOK_VERIFIED')
      res.status(200).send(challenge)
    } else {
      // Risponde con "403 Forbidden" se i token di verifica non corrispondono
      res.sendStatus(403)
    }
  }
})

// Accetta le richieste GET fatte alla rotta /webhook
app.get('/NormativaPrivacy', (req, res) => {
  res.send('https://github.com/franpic/ChatCUP/blob/master/informativaPrivacy.doc')
  res.status(200).send()
})

// Accetta le richieste POST fatte alla rotta /webhook
app.post('/webhook', (req, res) => {
  // Analizza il corpo della richiesta POST
  let body = req.body

  // Controlla che l'evento sul webhook sia generato da una pagina
  if (body.object === 'page') {
    // Itera attraverso ogni inserimento - potrebbero essere multipli se programmati
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

    // Restituisce una risposta "200 OK" a tutti gli eventi
    res.status(200).send('EVENT_RECEIVED')
  } else {
    // Restituisce una risposta "404 Not Found" se l'evento non proviene da una pagina
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
  return new Promise(async function (resolve, reject) {
    var messaggio = null

    // Se c'è, chiede il prossimo dato mancante
    if (await varConsultazioni[senderPsid].hasProssimoDatoDaChiedere() === true) {
      tipoDatoAtteso = ENUM_TIPO_INPUT_UTENTE.TEXT + ENUM_TIPO_INPUT_UTENTE.ATTACHMENTS
      messaggio = {
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'generic',
            'elements': [
              {
                'title': varConsultazioni[senderPsid].getFraseRichiestaProssimoDato(),
                'image_url': varConsultazioni[senderPsid].getUrlImmagineProssimoDato()
              }
            ]
          }
        }
      }
      callSendAPI(senderPsid, messaggio)
      resolve(true)
    } else {
      resolve(false)
    }
  })
    .catch(errore => {
      console.error(errore)
      return false
    })
}

function _chiediProssimaPrenotazione (senderPsid) {
  new Promise(async function (resolve, reject) {
    var messaggio = null
    var datiEsame = await varConsultazioni[senderPsid].getDatiProssimoEsame()
    if (datiEsame !== null) {
      messaggio = {
        'text': "Ecco gli appuntamenti per l'esame " + datiEsame['decrProdPrest'] + ' con codici ' + datiEsame['codProdPrest'] + ' (' + datiEsame['codCatalogoPrescr'] + ')'
      }
      await callSendAPI(senderPsid, messaggio)

      var listaAppuntamenti = await varConsultazioni[senderPsid].getListaDisponibilita()
      var elementi = []
      messaggio = {}

      for (var appuntamento of listaAppuntamenti) {
        var giornoDellaSettimana = appuntamento['momento'].getDay()
        const nomiGiorniSettimana = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']

        elementi.push({
          'title': nomiGiorniSettimana[giornoDellaSettimana].substr(0, 3) + ' ' + appuntamento['momento'].getDate() + '/' + (appuntamento['momento'].getMonth() + 1) + '/' + appuntamento['momento'].getFullYear() + ' - ' + appuntamento['momento'].toLocaleTimeString(),
          'subtitle': appuntamento['presidio']['nomePresidio'] + ' - ' + appuntamento['presidio']['localitaPresidio'],
          'buttons': [{
            'type': 'postback',
            'title': 'Prenota',
            'payload': 'prenotaAppuntamento ' + appuntamento['momento']
          }]
        })
      }

      tipoDatoAtteso = ENUM_TIPO_INPUT_UTENTE.POSTBACK + ENUM_TIPO_INPUT_UTENTE.QUICK_REPLY
      messaggio = {
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'generic',
            'elements': elementi
          }
        }
      }
      await callSendAPI(senderPsid, messaggio)

      messaggio = {
        'text': 'Toccando uno dei seguenti comandi puoi filtrare la lista appena mostrata o azzerare i filtri presenti',
        'quick_replies': [
          {
            'content_type': 'text',
            'title': 'Azzera Filtri',
            'payload': 'filtroAzzera'
          },
          {
            'content_type': 'text',
            'title': 'Filtra da Data',
            'payload': 'filtroData'
          },
          {
            'content_type': 'text',
            'title': 'Filtra per Città',
            'payload': 'filtroCitta'
          },
          {
            'content_type': 'text',
            'title': 'Filtra per Presidio',
            'payload': 'filtroPresidio'
          }
        ]

      }
      await callSendAPI(senderPsid, messaggio)

      resolve(true)
    } else {
      resolve(false)
    }
  })
    .catch(errore => {
      console.error(errore)
      return false
    })
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
 *
 * @todo Volendo si può velocizzare l'esecuzione di questa funzione creando una o più variabili d'istanza,
 * nella classe Consultazione, in modo che venga segnata la fase da gestire
 */
async function handleMessage (senderPsid, receivedMessage) {
  console.log('messaggioRicevuto: ' + JSON.stringify(receivedMessage))

  var messaggio
  var tipoDatoArrivato = null

  switch (true) {
    case (receivedMessage.quick_reply !== undefined):
      tipoDatoArrivato = ENUM_TIPO_INPUT_UTENTE.QUICK_REPLY
      break

    case (receivedMessage.attachments !== undefined):
      tipoDatoArrivato = ENUM_TIPO_INPUT_UTENTE.ATTACHMENTS
      break

    case (receivedMessage.text !== undefined):
      tipoDatoArrivato = ENUM_TIPO_INPUT_UTENTE.TEXT
      break

    default:
      break
  }

  if (tipoDatoAtteso.includes(tipoDatoArrivato)) {
    switch (varConsultazioni[senderPsid].fase) {
      case (varConsultazioni[senderPsid].ENUM_FASI.RACCOLTA_DATI):
        switch (tipoDatoArrivato) {
          case (ENUM_TIPO_INPUT_UTENTE.QUICK_REPLY):
            var payload = receivedMessage.quick_reply.payload
            switch (payload) {
              case ('siAltraRicetta'):
                varConsultazioni[senderPsid].setPerProssimaRicetta()
                if (await _chiediProssimoDato(senderPsid) === false) {
                  varConsultazioni[senderPsid].fase = varConsultazioni[senderPsid].ENUM_FASI.PRENOTAZIONE_ESAMI
                  await _chiediProssimaPrenotazione(senderPsid)
                }
                break

              case ('noAltraRicetta'):
                varConsultazioni[senderPsid].fase = varConsultazioni[senderPsid].ENUM_FASI.SUGGERIMENTI
                messaggio = {
                  'text': 'Hai suggerimenti per migliorare questo servizio di prenotazione?',
                  'quick_replies': [
                    {
                      'content_type': 'text',
                      'title': 'Si',
                      'payload': 'siSuggerimenti'
                    },
                    {
                      'content_type': 'text',
                      'title': 'No',
                      'payload': 'noSuggerimenti'
                    }
                  ]

                }
                await callSendAPI(senderPsid, messaggio)
                break

              default:
                varConsultazioni[senderPsid].setValoreInDato(payload)
                if (await _chiediProssimoDato(senderPsid) === false) {
                  varConsultazioni[senderPsid].fase = varConsultazioni[senderPsid].ENUM_FASI.PRENOTAZIONE_ESAMI
                  await _chiediProssimaPrenotazione(senderPsid)
                }
                break
            }
            break

          case (ENUM_TIPO_INPUT_UTENTE.ATTACHMENTS):
            let attachmentUrl = receivedMessage.attachments[0].payload.url
            let risposteRapide = []
            let valoriRiconosciutiInImmagine = null

            // Uso i servizi OCR per riconoscere il testo nelle foto
            valoriRiconosciutiInImmagine = await varConsultazioni[senderPsid].getPossibiliValoriDaImmagine(attachmentUrl)
            console.log('valoriRiconosciutiInImmagine: ' + valoriRiconosciutiInImmagine)
            if (valoriRiconosciutiInImmagine !== null) {
              for (var valorePotenziale of valoriRiconosciutiInImmagine) {
                risposteRapide.push({
                  content_type: 'text',
                  title: valorePotenziale,
                  payload: valorePotenziale
                })
              }

              messaggio = {
                text: "Nell'immagine ho riconosciuto i seguenti possibili valori " + varConsultazioni[senderPsid].getProssimaProposizioneArticolata() + ' ' + varConsultazioni[senderPsid].getProssimoNomeDato() + ". Se vedi quello giusto toccalo altrimenti puoi inviarmene un'altra foto oppure scrivermelo.",
                quick_replies: risposteRapide
              }
              tipoDatoAtteso = ENUM_TIPO_INPUT_UTENTE.QUICK_REPLY + ENUM_TIPO_INPUT_UTENTE.TEXT + ENUM_TIPO_INPUT_UTENTE.ATTACHMENTS
            } else {
              messaggio = {
                'text': 'Non ho riconosciuto ' + varConsultazioni[senderPsid].getProssimoArticoloDeterminativo() +
                        ' ' + varConsultazioni[senderPsid].getProssimoNomeDato() +
                        '.\n Puoi riprovare a fotografarlo oppure digitarlo?'
              }
            }
            await callSendAPI(senderPsid, messaggio)
            break

          case (ENUM_TIPO_INPUT_UTENTE.TEXT):
            if (varConsultazioni[senderPsid].setValoreInDato(receivedMessage.text) === false) {
              messaggio = {
                'text': varConsultazioni[senderPsid].getFraseFormatoDatoErrato()
              }
              await callSendAPI(senderPsid, messaggio)
            }

            if (await _chiediProssimoDato(senderPsid) === false) {
              varConsultazioni[senderPsid].fase = varConsultazioni[senderPsid].ENUM_FASI.PRENOTAZIONE_ESAMI
              await _chiediProssimaPrenotazione(senderPsid)
            }
            break

          default:
            break
        }
        break

      case (varConsultazioni[senderPsid].ENUM_FASI.PRENOTAZIONE_ESAMI):
        switch (tipoDatoArrivato) {
          case (ENUM_TIPO_INPUT_UTENTE.QUICK_REPLY):
            let payload = receivedMessage.quick_reply.payload
            switch (payload) {
              case ('siPrenota'):
                if (await varConsultazioni[senderPsid].prenotaEsame(true) === true) {
                  messaggio = {
                    'text': "L'esame è stato prenotato.\n" +
                            'Il numero coupon della prenotazione è ' + Math.floor(Math.random() * 10000) + ' del ' + (new Date()).getFullYear()
                  }
                  await callSendAPI(senderPsid, messaggio)

                  varConsultazioni[senderPsid].fase = varConsultazioni[senderPsid].ENUM_FASI.EMAIL
                  tipoDatoAtteso = ENUM_TIPO_INPUT_UTENTE.QUICK_REPLY
                  messaggio = {
                    'text': 'Desideri ricevere il riepilogo della prenotazione per email?',
                    'quick_replies': [
                      {
                        'content_type': 'text',
                        'title': 'Si',
                        'payload': 'siEmail'
                      },
                      {
                        'content_type': 'text',
                        'title': 'No',
                        'payload': 'noEmail'
                      }
                    ]
                  }
                  await callSendAPI(senderPsid, messaggio)
                } else {
                  messaggio = {
                    'text': "Non sono riuscito a prenotare l'esame"
                  }
                  await callSendAPI(senderPsid, messaggio)
                }
                break

              case ('noPrenota'):
                messaggio = {
                  'text': 'Non hai prenotato'
                }
                await callSendAPI(senderPsid, messaggio)
                await _chiediProssimaPrenotazione(senderPsid)
                break

              case ('filtroAzzera'):

                break

              case ('filtroData'):
                break

              case ('filtroCitta'):

                break

              case ('filtroPresidio'):

                break

              default:
                break
            }
            break

          case (ENUM_TIPO_INPUT_UTENTE.ATTACHMENTS):
            await _chiediProssimaPrenotazione(senderPsid)
            break

          case (ENUM_TIPO_INPUT_UTENTE.TEXT):
            await _chiediProssimaPrenotazione(senderPsid)
            break

          default:
            break
        }
        break

      case (varConsultazioni[senderPsid].ENUM_FASI.EMAIL):
        switch (tipoDatoArrivato) {
          case (ENUM_TIPO_INPUT_UTENTE.QUICK_REPLY):
            let payload = receivedMessage.quick_reply.payload
            switch (payload) {
              case ('siEmail'):
                tipoDatoAtteso = ENUM_TIPO_INPUT_UTENTE.TEXT
                messaggio = {
                  'text': 'A quale indirizzo email preferisci ricevere il riepilogo?'
                }
                await callSendAPI(senderPsid, messaggio)
                break

              case ('noEmail'):
                var esito = await _chiediProssimaPrenotazione(senderPsid) // @todo La seconda condizione è solo un workaround. Capire perchè a volte restituisce undefined
                if (esito === false || esito === undefined) {
                  messaggio = {
                    'text': 'Hai prenotato tutti gli esami di questa ricetta'
                  }
                  await callSendAPI(senderPsid, messaggio)

                  varConsultazioni[senderPsid].fase = varConsultazioni[senderPsid].ENUM_FASI.RACCOLTA_DATI
                  tipoDatoAtteso = ENUM_TIPO_INPUT_UTENTE.QUICK_REPLY
                  messaggio = {
                    'text': "Hai un'altra ricetta, con esami da prenotare, a nome della stessa persona?",
                    'quick_replies': [
                      {
                        'content_type': 'text',
                        'title': 'Si',
                        'payload': 'siAltraRicetta'
                      },
                      {
                        'content_type': 'text',
                        'title': 'No',
                        'payload': 'noAltraRicetta'
                      }
                    ]
                  }
                  await callSendAPI(senderPsid, messaggio)
                }
                break
            }
            break

          case (ENUM_TIPO_INPUT_UTENTE.ATTACHMENTS):
            break

          case (ENUM_TIPO_INPUT_UTENTE.TEXT):
            var re = new RegExp(/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*/)
            var indirizzoEmail = ''
            if (re.test(receivedMessage.text)) {
              indirizzoEmail = re.exec(receivedMessage.text)
              messaggio = {
                'text': "Ti ho inviato il riepilogo all'indirizzo " + indirizzoEmail
              }
              await callSendAPI(senderPsid, messaggio)

              esito = await _chiediProssimaPrenotazione(senderPsid) // @todo La seconda condizione dell'if è solo un workaround. Capire perchè a volte restituisce undefined
              if (esito === false || esito === undefined) {
                messaggio = {
                  'text': 'Hai prenotato tutti gli esami di questa ricetta'
                }
                await callSendAPI(senderPsid, messaggio)

                varConsultazioni[senderPsid].fase = varConsultazioni[senderPsid].ENUM_FASI.RACCOLTA_DATI
                tipoDatoAtteso = ENUM_TIPO_INPUT_UTENTE.QUICK_REPLY
                messaggio = {
                  'text': "Hai un'altra ricetta, con esami da prenotare, a nome della stessa persona?",
                  'quick_replies': [
                    {
                      'content_type': 'text',
                      'title': 'Si',
                      'payload': 'siAltraRicetta'
                    },
                    {
                      'content_type': 'text',
                      'title': 'No',
                      'payload': 'noAltraRicetta'
                    }
                  ]
                }
                await callSendAPI(senderPsid, messaggio)
              }
            } else {
              tipoDatoAtteso = ENUM_TIPO_INPUT_UTENTE.TEXT
              messaggio = {
                'text': 'Questo indirizzo email non ha la giusta forma. Potresti verificare e reinviarmelo?'
              }
              await callSendAPI(senderPsid, messaggio)
            }

            break

          default:
            break
        }
        break

      case (varConsultazioni[senderPsid].ENUM_FASI.SUGGERIMENTI):
        switch (tipoDatoArrivato) {
          case (ENUM_TIPO_INPUT_UTENTE.QUICK_REPLY):
            let payload = receivedMessage.quick_reply.payload
            switch (payload) {
              case ('siSuggerimenti'):
                tipoDatoAtteso = ENUM_TIPO_INPUT_UTENTE.TEXT
                messaggio = {
                  'text': 'Quali sono?'
                }
                await callSendAPI(senderPsid, messaggio)
                break

              case ('noSuggerimenti'):
                messaggio = {
                  'text': 'Grazie per avermi contattato'
                }
                await callSendAPI(senderPsid, messaggio)
                delete varConsultazioni[senderPsid]
                break
            }
            break

          case (ENUM_TIPO_INPUT_UTENTE.ATTACHMENTS):
            break

          case (ENUM_TIPO_INPUT_UTENTE.TEXT):
            messaggio = {
              'text': 'Grazie per avermi contattato'
            }
            await callSendAPI(senderPsid, messaggio)
            delete varConsultazioni[senderPsid]
            break

          default:
            break
        }
    }
  } else {
    messaggio = {
      'text': 'In questo momento non mi aspetto questo tipo di risposta'
    }
    await callSendAPI(senderPsid, messaggio)
  }
}

/**
 * Gestisce gli eventi messaging_postbacks
 * @param {*} senderPsid L'id facebook di chi sta chattando con il bot
 * @param {*} receivedPostback Il postback ricevuto come messaggio dall'utente
 */
async function handlePostback (senderPsid, receivedPostback) {
  console.log('Entrato in handlePostback()')
  let messaggio

  // Recupera il payload del postback
  let payload = receivedPostback.payload

  // Imposta la risposta basata sul payload del postback
  if (payload === 'inizia') {
    varConsultazioni[senderPsid] = new Consultazione()
    varConsultazioni[senderPsid].fase = varConsultazioni[senderPsid].ENUM_FASI.RACCOLTA_DATI

    var debug = false
    if (debug === true) {
      await varConsultazioni[senderPsid].setValoreInDato('PCCFNC88C20F262P')
      await varConsultazioni[senderPsid].setValoreInDato('12345678901234567890')
      tipoDatoAtteso = ENUM_TIPO_INPUT_UTENTE.TEXT
      await handleMessage(senderPsid, {'text': '160A41234567890'})
    } else {
      messaggio = {
        'text': 'Ciao ' + await _getNomeDaPsid(senderPsid)
      }
      await callSendAPI(senderPsid, messaggio)

      messaggio = {
        'text': 'Per effettuare una prenotazione assicurati di essere in possesso di:\n' +
                varConsultazioni[senderPsid].getListaDocumenti()
      }
      await callSendAPI(senderPsid, messaggio)

      _chiediProssimoDato(senderPsid)
    }
  } else if (payload.includes('prenotaAppuntamento')) {
    messaggio = {
      'text': 'Note ed Avvertenze:\n' + await varConsultazioni[senderPsid].getNoteAvvertenze()
    }
    await callSendAPI(senderPsid, messaggio)

    tipoDatoAtteso = ENUM_TIPO_INPUT_UTENTE.QUICK_REPLY
    messaggio = {
      'text': 'Confermi la prenotazione?',
      'quick_replies': [
        {
          'content_type': 'text',
          'title': 'Si',
          'payload': 'siPrenota'
        },
        {
          'content_type': 'text',
          'title': 'No',
          'payload': 'noPrenota'
        }
      ]
    }
    await callSendAPI(senderPsid, messaggio)
  } else {
    messaggio = {
      'text': 'Mi spiace ma non ho capito'
    }

    await callSendAPI(senderPsid, messaggio)
  }
}

/**
 * Invia messaggi di risposta usando l'API
 * @param {*} senderPsid L'id facebook di chi sta chattando con il bot
 *
 * @param {*} risposta La risposta da inviare all'interlocutore del bot
 */
function callSendAPI (senderPsid, messaggio) {
  console.log('Entrato in CallSendApi')

  return new Promise((resolve, reject) => {
    // Costruisce il corpo del messaggio
    let requestBody = {
      'recipient': {
        'id': senderPsid
      },
      'message': messaggio
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
