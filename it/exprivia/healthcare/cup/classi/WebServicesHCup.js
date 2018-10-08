'use strict'

const request = require('request')

class WebServicesHCup {
  constructor () {
    this.sToken = ''
    this.sPercorsoBase = 'http://10.0.11.175/healthcare-rest/rest'
    // this.sPercorsoBase = 'https://hcup.aslbat.it/healthcare-rest/rest'
  }

  /**
   * Effettua il login su nCup
   *
   * @returns {String} la stringa contenente il token generato dal Login se il login fallisce
   */
  _login () {
    var t = this
    return new Promise((resolve, reject) => {
      const sPercorsoRelativoAllaBase = '/login'

      // Costruisce il corpo della request
      var requestBody = {
        'username': 'franpic@live.it',
        'password': 'W6ph5Mm5Pz8GgiULbPgzG37mj9g=',
        'deviceId': 'web'
      }

      request({
        uri: t.sPercorsoBase + sPercorsoRelativoAllaBase,
        method: 'POST',
        json: true,
        body: requestBody
      }, (err, res, body) => {
        if (!err) {
          t.sToken = body['token']
          console.log('sToken attuale = ' + t.sToken)
          resolve(body['token'])
        } else {
          reject(new Error('Errore: ' + err))
        }
      })
    })
      .catch(errore => {
        console.log(errore)
        return null
      })
  }

  /**
   * Utilizza il webService getPaziente di hCup
   *
   * @param {String} token la stringa contenente il token generato dall'ultimo login
   *
   * @todo Quando verrà sistemato il WS per controllare il token, adeguare questo metodo
   */
  getPaziente (sCodiceFiscalePaziente) {
    var t = this
    return new Promise(async function (resolve, reject) {
      const sPercorsoRelativoAllaBase = '/getpaziente'
      var sCodiceEsito = ''

      // Costruisce il corpo della request
      var requestBody = {
        'token': t.sToken,
        'operatore': {
          'username': 'PPAHCP15A01F284B',
          'password': 'W6ph5Mm5Pz8GgiULbPgzG37mj9g='
        },
        'paziente': {
          'codiceFiscale': sCodiceFiscalePaziente
        }
      }

      request({
        uri: t.sPercorsoBase + sPercorsoRelativoAllaBase,
        method: 'POST',
        json: true,
        body: requestBody
      }, async function (err, res, body) {
        if (!err) {
          sCodiceEsito = body['elencoMessaggi'][0]['codice']
        } else {
          sCodiceEsito = 'getpaziente.failed'
        }

        switch (sCodiceEsito) {
          case 'getpaziente.failed':
            reject(new Error(false))
            break
          case 'invalid.token':
            await t._login()
            await t.getPaziente(sCodiceFiscalePaziente)
            break
          default:
            resolve(body)
            break
        }
      })
    })
      .catch(errore => {
        return errore
      })
  }

  /**
   * @todo ATTENZIONE! QUESTO E' UNO STUB DA MODIFICARE IL PRIMA POSSIBILE!
   * Restituisce la lista di esami contenuti in una ricetta, partendo dal numero di questa (l'NRE).
   *
   * @param {dettaglioPrescrizioneElettronica[]} numRicettaElettronica il numero della ricetta elettronica, composto dalla concatenazione delle parti X e Y
   */
  getPrescrizioneElettronica (cfPaziente, numRicettaElettronica) {
    return new Promise(function (resolve, reject) {
      const dbEsami = [
        {
          'codProdPrest': '8952',
          'decrProdPrest': 'ELETTROCARDIOGRAMMA',
          'codCatalogoPrescr': '49591'
        },
        {
          'codProdPrest': Math.floor(Math.random() * 10000),
          'decrProdPrest': 'ELETTROCARDIOGRAMMA TRANSESOFAGEO',
          'codCatalogoPrescr': Math.floor(Math.random() * 100000)
        }
      ]
      // var numEsamiDaRestituire = Math.floor(Math.random() * dbEsami.length) + 1
      var numEsamiDaRestituire = 1
      var esamiDaRestituire = []

      for (var i = 0; i < numEsamiDaRestituire; i++) {
        esamiDaRestituire.push(dbEsami[i])
      }
      resolve(esamiDaRestituire)
    })
      .catch(errore => {
        return errore
      })
  }

  /**
   * Generato per lo stub di seguito
   * @param {*} dataInizio
   * @param {*} dataFine
   * @param {*} orarioInizio
   * @param {*} orarioFine
   */
  _getAppuntamentoCasuale (dataInizio, citta, presidio) {
    var appuntamento = {
      'momento': '',
      'presidio': {
        'nomePresidio': '',
        'localitaPresidio': ''
      }
    }

    const jsonAnagrafePresidiPuglia = require('../../../../../originiDati/anagrafePresidiPuglia2016.json')
    const numPresidi = Object.keys(jsonAnagrafePresidiPuglia).length
    const numCasualePresidio = Math.floor(Math.random(numPresidi) * numPresidi)

    var dataFine = new Date(dataInizio)
    dataFine.setDate(dataFine.getDate() + 10)

    const orarioInizio = 8
    const orarioFine = 20

    appuntamento['momento'] = new Date(dataInizio.getTime() + Math.random() * (dataFine.getTime() - dataInizio.getTime()))
    appuntamento['momento'].setHours(orarioInizio + Math.random() * (orarioFine - orarioInizio))

    if (citta === '') {
      appuntamento['presidio']['localitaPresidio'] = jsonAnagrafePresidiPuglia[numCasualePresidio]['DENOMINAZIONE_STRUTTURA']
    } else {
      appuntamento['presidio']['localitaPresidio'] = citta
    }

    if (presidio === '') {
      appuntamento['presidio']['nomePresidio'] = jsonAnagrafePresidiPuglia[numCasualePresidio]['COMUNE_SEDE']
    } else {
      appuntamento['presidio']['nomePresidio'] = presidio
    }

    return (appuntamento)
  }

  /**
   * @todo ATTENZIONE! QUESTO E' UNO STUB DA MODIFICARE IL PRIMA POSSIBILE!
   * Restituisce la lista degli appuntamenti di un esame, fornito il codice dell'esame.
   *
   * @param {codCatalogoPrescr} numRicettaElettronica il numero della ricetta elettronica, composto dalla concatenazione delle parti X e Y
   */
  getListaDisponibilita (codCatalogoPrescr, data, citta, presidio) {
    var t = this

    return new Promise(function (resolve, reject) {
      const numAppuntamentiDaRestituire = Math.floor(Math.random() * 10) + 1
      var dData = null

      if (data === '') {
        dData = new Date()
      } else {
        dData = new Date(Number(data.substr(6, 4)), Number(data.substr(3, 2)), Number(data.substr(0, 2)))
      }

      var appuntamentiDaRestituire = []

      for (var i = 0; i < numAppuntamentiDaRestituire; i++) {
        var ultimoAppuntamento = t._getAppuntamentoCasuale(dData, citta, presidio)
        dData = ultimoAppuntamento['momento']
        appuntamentiDaRestituire.push(ultimoAppuntamento)
      }
      resolve(appuntamentiDaRestituire)
    })
      .catch(errore => {
        console.error(errore)
        return errore
      })
  }

  /**
   * @todo ATTENZIONE! QUESTO E' UNO STUB DA MODIFICARE IL PRIMA POSSIBILE!
   *
   */
  getNoteAvvertenze () {
    return new Promise(function (resolve, reject) {
      resolve({
        'noteAvvertenze': '- Non è necessario essere a digiuno ma è preferibile fare una colazione leggera\n' +
                '- Per la prova è meglio indossare indumenti comodi\n' +
                '- Si deve avvisare il personale di eventuali disturbi accusati nelle ultime 48 ore.\n' +
                "- Presentarsi all'appuntamento con tutta la documentazione relativa a visite ed esami precedenti (ECG, visite cardiologiche, esami ematochimici ed altro)"
      })
    })
      .catch(errore => {
        console.error(errore)
        return errore
      })
  }

  setPrenota (isConfermato) {
    return isConfermato
  }
}

module.exports = WebServicesHCup
