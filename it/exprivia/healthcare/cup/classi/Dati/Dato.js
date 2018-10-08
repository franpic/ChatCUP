'use strict'

const request = require('request')
const dv = require('dv')

/**
 * Classe Astratta dato
 *
 * @method _checkValore() returns Boolean. E' un metodo, astratto, che le classi che eriditano da questa,
 * devono implementare.
 * _checkValore() controlla che il valore che si vuole attribuire al dato rispetti
 * il patternRegexStretta e regole semantiche, se ce ne sono.
 * Restituisce true se tutti i controlli sono superati, false altrimenti.
 */
class Dato {
  /**
   * Il costruttore della classe Dato
   *
   * @param {string} nomeDato il nome del dato
   * @param {string} articoloDeterminativo l'articolo determinativo, relativo al nome del dato
   * @param {string} proposizioneArticolata la proposizione articolata, relativa al nome del dato
   * @param {string} percorsoImmagine il percorso o l'URL attraverso cui raggungere l'immagine
   * @param {RegExp} regexAmbigua il pattern della regex che deve catturare il valore del dato, con eventuali ambiguità
   * @param {RegExp} regexStretta il pattern della regex che deve catturare il valore del dato, senza ambiguità
   * @param {string} sTipiCaratteriAttesi la stringa contenente una successione dei caratteri 'L' ed 'C'.
   *                                         'L' indica che quel posto deve essere occupato da una lettera;
   *                                         'C' indica che quel posto deve essere occupato da una cifra.
   *                                         TODO: cercare di eliminarla estraendo queste informazioni dal patternRegexStretta
   */
  constructor (nomeDato, articoloDeterminativo, proposizioneArticolata, percorsoImmagine, patternRegexAmbigua, patternRegexStretta, sTipiCaratteriAttesi) {
    if (this.constructor === Dato) {
      throw new TypeError('La classe astratta Dato, non può essere istanziata direttamente')
    } else {
      if (this._checkValore === undefined) {
        throw new TypeError('La classe ' + this.constructor.name + ' deve implementare il metodo astratto interno _checkValore')
      } else {
        this.nomeDato = nomeDato
        this.articoloDeterminativo = articoloDeterminativo
        this.proposizioneArticolata = proposizioneArticolata
        this.percorsoImmagine = percorsoImmagine
        this.regexAmbigua = patternRegexAmbigua
        this.regexStretta = patternRegexStretta
        this.sTipiCaratteriAttesi = sTipiCaratteriAttesi
        this.valore = ''
      }
    }
  }

  /**
   * Restituisce il nome del dato
   */
  getNomeDato () {
    return this.nomeDato
  }

  /**
   * Restituisce l'articolo determinativo per il nome del dato
   */
  getArticoloDeterminativo () {
    return this.articoloDeterminativo
  }

  /**
   * Restituisce la proposizione articolata per il nome del dato
   */
  getProposizioneArticolata () {
    return this.proposizioneArticolata
  }

  /**
   * Restituisce il percorso dell'immagine rappresentativa del dato
   */
  getPercorsoImmagineRappresentativa () {
    return this.percorsoImmagine
  }

  /**
   * Corregge le cifre in lettere e viceversa nella stringa sValore,
   * in base a quanto indicato nella stringa sTipiCaratteriAttesi,
   * nella quale ogni carattere indica se il carattere, in sValore,
   * nella stessa posizione, deve essere una Lettera o una Cifra.
   *
   * @param {string} sValore la stringa da controllare e da correggere
   * @param {string} sTipiCaratteriAttesi la stringa, della stessa lunghezza di sValore, che contiene una serie di L e C, a seconda che il carattere di sValore, nella stessa posizione, sia una Lettera o una Cifra.
   *
   * @returns {String} la stringa con le ambiguità corrette
   */
  _correggiCifreELettere (sValore, sTipiCaratteriAttesi) {
    var jsAmbiguita = require('../Ambiguita.json')
    var iValore = 0

    if (sValore.length === sTipiCaratteriAttesi.length) {
      sTipiCaratteriAttesi.toUpperCase()

      while (iValore < sValore.length) {
        switch (sTipiCaratteriAttesi[iValore]) {
          case 'L':
            jsAmbiguita.forEach(elemento => {
              sValore = sValore.substring(0, iValore) + sValore[iValore].replace(elemento['cifra'], elemento['lettera']) + sValore.substring(iValore + 1)
            })
            break
          case 'C':
            jsAmbiguita.forEach(elemento => {
              sValore = sValore.substring(0, iValore) + sValore[iValore].replace(elemento['lettera'], elemento['cifra']) + sValore.substring(iValore + 1)
            })
            break
          default:
            console.log('Il tipo carattere ' + sTipiCaratteriAttesi[iValore] + ', in posizione ' + iValore + ', non è valido. Deve essere L o C. Salto il controllo del carattere in questa posizione.')
            break
        }

        iValore = iValore + 1
      }
    } else {
      // TODO: Meglio lanciare eccezione?
      console.log('Non ho effettuato nessuna sostituzione perchè i 2 parametri in input non hanno lo stesso numero di caratteri.')
    }

    return sValore
  }

  /**
   * Restituisce il valore del dato
   *
   * @returns {string} il valore del dato
   */
  getValore () {
    return this.valore
  }

  /**
   * Assegna un valore al dato
   * @param {string} valore il valore da attribuire al dato
   *
   * @returns {boolean} true se assegnazione riuscita, false altrimenti
   */
  setValore (valore) {
    valore = valore.toUpperCase()
    if (this._checkValore(valore) === true) {
      this.valore = valore
      console.log('Il valore ' + valore + ' è stato accettato.')
      return true
    } else {
      console.log('Il valore ' + valore + ' non è stato accettato perchè non è corretto.')
      return false
    }
  }

  /**
   * recupera il testo presente in un immagine, utilizzando il servizio OCR di Microsoft Azure
   * @param {String} percorsoImmagine il percorso dove poter reperire l'immagine
   *
   * @returns {String, null} Una stringa rappresentante il JSON restituito da microsoft Azure
   * oppure null se non viene riconosciuto testo
   */
  _getTestoDaImmagineConAzureOCR (percorsoImmagine) {
    return new Promise((resolve, reject) => {
      console.log('Entrato in _getTestoDaImmagineConAzureOCR')

      // Opzioni e chiamata REST all'API Azure per l'OCR
      let options = {
        uri: 'https://westeurope.api.cognitive.microsoft.com/vision/v2.0/ocr',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': 'cfe4482822c64e968ccd915153b0f144'
        },
        qs: {
          'language': 'unk',
          'detectOrientation': 'true'
        },
        body: {
          url: percorsoImmagine
        },
        json: true
      }

      request(options, (error, response, body) => {
        if (error) {
          console.error(error.stack)
          reject(new Error(null))
        } else {
          if (body === undefined) {
            reject(new Error(null))
          } else {
            resolve(JSON.stringify(body, null, 2))
          }
        }
      })
    })
      .catch(error => {
        console.error('ErroreAzure: ' + error)
        return null
      })
  }

  /**
   * Restituisce il Buffer non codificato, contenente i dati dell'immagine da cui estrapolare il valore
   * @param {String} urlImmagine l'url dell'immagine di cui recuperare il Buffer
   *
   * @returns {Buffer, null} il Buffer non codificato, contenente i dati dell'immagine da cui estrapolare il valore
   * oppure null
   */
  __getTipoEBufferImmagineDaUrl (urlImmagine) {
    return new Promise((resolve, reject) => {
      console.log('Entrato in __getTipoEBufferImmagineDaUrl')

      const options = {
        uri: urlImmagine,
        method: 'GET',
        encoding: null
      }

      request(options, (err, res, body) => {
        if (!err) {
          try {
            const patternTipoImmagine = /(jpeg)|(jpg)|(png)/
            const regexTipoImmagine = new RegExp(patternTipoImmagine)
            var tipo = regexTipoImmagine.exec(res['headers']['content-type'])[0]
            if (tipo === 'jpeg') {
              tipo = 'jpg'
            }
            resolve({
              tipoImmagine: tipo,
              buffer: body
            })
          } catch (errore) {
            reject(new Error(null))
          }
        } else {
          console.error('Errore: ' + err)
          reject(new Error(null))
        }
      })
    })
      .catch(errore => {
        return null
      })
  }

  /**
   * Recupera il valore del codice a barre contenuto nell'immagine, usando la libreria VD
   * @param {String} urlImmagine l'url dell'immagine contenente il codice a barre
   *
   * @returns {String, null} il valore del codice a barre contenuto nell'immagine oppure null
   */
  _getValoreDaImmagineCodiceABarreConVdZXing (urlImmagine) {
    var t = this
    return new Promise(async function (resolve, reject) {
      console.log('Entrato in _getValoreDaImmagineCodiceABarreConVdZXing')

      const tipoEBufferImmagine = await t.__getTipoEBufferImmagineDaUrl(urlImmagine)
      if (tipoEBufferImmagine === null) {
        reject(new Error(null))
      } else {
        const bufferImmagine = tipoEBufferImmagine['buffer']
        const image = new dv.Image(tipoEBufferImmagine['tipoImmagine'], bufferImmagine)
        const zxing = new dv.ZXing(image)
        zxing.tryHarder = true
        const codiceDaZxing = zxing.findCode()
        if (codiceDaZxing === null) {
          reject(new Error(null))
        } else {
          resolve(codiceDaZxing['data'])
        }
      }
    })
      .catch(errore => {
        return null
      })
  }

  /**
   * Recupera il testo nell'immagine, usando la libreria VD
   * @param {String} urlImmagine l'url dell'immagine contenente il testo
   *
   * @returns {String, null} il testo contenuto nell'immagine oppure null
   */
  _getTestoDaImmagineConVdTesseract (urlImmagine) {
    var t = this
    return new Promise(async function (resolve, reject) {
      console.log('Entrato in _getTestoDaImmagineConVdTesseract')

      const tipoEBufferImmagine = await t.__getTipoEBufferImmagineDaUrl(urlImmagine)
      const bufferImmagine = tipoEBufferImmagine['buffer']
      const image = new dv.Image(tipoEBufferImmagine['tipoImmagine'], bufferImmagine)
      const tesseract = new dv.Tesseract('eng', image)
      const risultato = tesseract.findText('plain')
      if (risultato === null) {
        reject(new Error(null))
      } else {
        resolve(risultato)
      }
    })
      .catch(errore => {
        return null
      })
  }

  /**
   * Estrae i valori che ci interessano usando le espressioni regolari caratterizzanti il dato
   * @param {String} testo il testo da cui estrarre il valore
   *
   * @returns {String, null} un array di stringhe contenente i valori riconosciuti che possono essere validi
   * oppure null se il riconoscimento non va a buon fine
   */
  _getValoriDaTesto (testo) {
    return new Promise((resolve, reject) => {
      var matchValoriPresunti = this.regexAmbigua[Symbol.match](testo)
      var valoriValidi = []

      if (matchValoriPresunti === null) {
        reject(matchValoriPresunti)
      } else {
        for (var match of matchValoriPresunti) {
          var valorePresunto = ''
          this.regexAmbigua.lastIndex = 0
          match = this.regexAmbigua.exec(match)
          if (match.length === 1) {
            valorePresunto = match[0]
          } else {
            for (var i = 1; i < match.length; i++) {
              valorePresunto = valorePresunto + match[i]
            }
          }

          valorePresunto = this._correggiCifreELettere(valorePresunto, this.sTipiCaratteriAttesi)
          valorePresunto = valorePresunto.toUpperCase()
          if (this.regexStretta.test(valorePresunto) === true) {
            valoriValidi.push(valorePresunto)
          }
        }
        if (valoriValidi.length === 0) {
          reject(new Error(null))
        } else {
          resolve(valoriValidi)
        }
      }
    })
      .catch(errore => {
        return null
      })
  }

  /**
   * Restituisce un valore letto in un immagine.
   * Dal testo presente nell'immagine, viene estratto quel valore che rispetta la RegExp Ambigua.
   * Nel valore vengono corrette eventuali ambiguità ed infine viene testato con la RegExp Stretta.
   * Solo se supera quest'ultimo test, viene restituito.
   * @param {String} percorsoImmagine il path o l'url dell'immagine
   *
   * @returns {String[], null} la stringa contenente il valore riconosciuto o null
   */
  getPossibiliValoriDaImmagine (percorsoImmagine) {
    var t = this
    var valorePresunto = null
    return new Promise(async function (resolve, reject) {
      valorePresunto = await t._getValoriDaTesto(await t._getTestoDaImmagineConAzureOCR(percorsoImmagine))
      if (valorePresunto === null) {
        valorePresunto = await t._getValoriDaTesto(await t._getTestoDaImmagineConVdTesseract(percorsoImmagine))
        if (valorePresunto === null) {
          valorePresunto = await t._getValoreDaImmagineCodiceABarreConVdZXing(percorsoImmagine)
          if (valorePresunto === null) {
            reject(new Error(null))
          }
        }
      }
      
      resolve(valorePresunto)
    })
      .catch(errore => {
        return null
      })
  }
}

module.exports = Dato
