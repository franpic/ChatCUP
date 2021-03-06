'use strict'

var CodiceFiscale = require('./Dati/CodiceFiscale.js')
var NumeroTesseraSanitaria = require('./Dati/NumeroTesseraSanitaria.js')
var NumeroRicettaElettronica = require('./Dati/NumeroRicettaElettronica.js')
var WebServicesHCup = require('./WebServicesHCup.js')

/**
 * Classe che rappresenta una Consultazione con tutti i suoi dati
 * @todo completare questa descrizione con i metodi
 */
class Consultazione {
  /**
   * Il costruttore della consultazione
   */
  constructor () {
    this._arrDati = [
      new CodiceFiscale(),
      new NumeroTesseraSanitaria(),
      new NumeroRicettaElettronica()
    ]

    this._ultimiValoriRiconosciutiDaOcr = null
    this._ultimiEsamiEstrattiDaRicetta = null
    this.ENUM_FASI = Object.freeze({
      RACCOLTA_DATI: 'dati',
      PRENOTAZIONE_ESAMI: 'prenotazioneEsame',
      EMAIL: 'email',
      SUGGERIMENTI: 'suggerimenti'
    })
    this.fase = null
    this.filtriAppuntamenti = {
      'data': '',
      'citta': '',
      'presidio': ''
    }
  }

  /**
   * Restituisce il prossimo oggetto di tipo Dato che non ha un valore impostato
   *
   * @returns {Dato} il prossimo dato per cui impostare il valore o null se tutti i dati hanno un valore impostato
   */
  _getProssimoDato () {
    var iDati = 0
    var trovato = false
    var prossimoDato = null

    while (iDati < this._arrDati.length && trovato === false) {
      if (this._arrDati[iDati].getValore() === '') {
        prossimoDato = this._arrDati[iDati]
        trovato = true
      } else {
        iDati = iDati + 1
      }
    }

    return prossimoDato
  }

  setPerProssimaRicetta () {
    this._arrDati[2] = new NumeroRicettaElettronica()
    this._ultimiEsamiEstrattiDaRicetta = null
    this.filtriAppuntamenti = {
      'data': '',
      'citta': '',
      'presidio': ''
    }
  }

  /**
   * Restituisce un testo contenente la lista puntata dei dati richiesti durante la consultazione
   *
   * @returns {String} un testo contenente la lista puntata dei dati richiesti durante la consultazione
   */
  getListaDati () {
    let lista = ''

    this._arrDati.forEach(dato => {
      lista = lista + '- ' + dato.getNomeDato() + '\n'
    })

    return lista
  }

  getListaDocumenti () {
    let lista = '- Tessera Sanitaria\n' +
                '- Ricetta Elettronica'

    return lista
  }

  /**
   * Restituisce la frase di richiesta del prossimo dato da valorizzare
   *
   * @returns {String} il testo per la richiesta del dato o null, se non c'è un dato da valorizzare
   */
  getFraseRichiestaProssimoDato () {
    var dato = this._getProssimoDato()

    if (dato === null) {
      return null
    } else {
      return 'Scrivi o invia l\'immagine ' + dato.getProposizioneArticolata() + ' ' + dato.getNomeDato() + ' dell\'intestatario della ricetta'
    }
  }

  /**
   * Restituisce la frase di formato errato del dato inserito dall'utente
   *
   * @returns {String} il testo per la segnalazione del formato errato o null, se non c'è un dato da valorizzare
   */
  getFraseFormatoDatoErrato () {
    var dato = this._getProssimoDato()

    if (dato === null) {
      return null
    } else {
      return dato.getArticoloDeterminativo() + ' ' + dato.getNomeDato() + ' non è formalmente corretto.'
    }
  }

  /**
   * Restituisce il percorso all'immagine rappresentativa del prossimo dato da valorizzare
   *
   * @returns {String} il percorso per l'immagine rappresentativa del dato o null, se non c'è un dato da valorizzare
   */
  getUrlImmagineProssimoDato () {
    var dato = this._getProssimoDato()

    if (dato === null) {
      return null
    } else {
      return dato.getPercorsoImmagineRappresentativa()
    }
  }

  /**
   * Restituisce true se esiste un dato non valorizzato, false altrimenti
   *
   * @returns {Boolean} true se esiste un dato non valorizzato, false altrimenti
   */
  hasProssimoDatoDaChiedere () {
    return new Promise((resolve, reject) => {
      var dato = this._getProssimoDato()

      if (dato === null) {
        resolve(false)
      } else {
        resolve(true)
      }
    })
      .catch(errore => {
        console.error(errore)
        return false
      })
  }

  /**
   * Imposta il valore di un dato
   * @param {String} valore la stringa contenente il valore del dato
   *
   * @returns {Boolean} true se il valore viene impostato con successo, false altrimenti
   */
  setValoreInDato (valore) {
    console.log('Entrato in setValoreInDato in Consultazione.js con valore ' + valore)

    var dato = this._getProssimoDato()

    if (dato === null) {
      return false
    } else {
      return dato.setValore(valore)
    }
  }

  /**
   * Restituisce il valore del dato corrente, riconoscito in un'immagine
   * @param {String} percorso il percorso dell'immagine
   *
   * @returns {String} il valore riconosciuto o null
   */
  getPossibiliValoriDaImmagine (percorso) {
    var dato = this._getProssimoDato()

    if (dato === null) {
      return null
    } else {
      this._ultimiValoriRiconosciutiDaOcr = dato.getPossibiliValoriDaImmagine(percorso)
      return this._ultimiValoriRiconosciutiDaOcr
    }
  }

  /**
   * Restituisce articolo determinativo del prossimo dato da popolare
   *
   * @returns {String} l'articolo determinativo del prossimo dato da popolare o null
   */
  getProssimoArticoloDeterminativo () {
    var dato = this._getProssimoDato()

    if (dato === null) {
      return null
    } else {
      return dato.getArticoloDeterminativo()
    }
  }

  /**
   * Restituisce nome dato del prossimo dato da popolare
   *
   * @returns {String} il nome dato del prossimo dato da popolare o null
   */
  getProssimoNomeDato () {
    var dato = this._getProssimoDato()

    if (dato === null) {
      return null
    } else {
      return dato.getNomeDato()
    }
  }

  /**
   * Restituisce la proposizione articolata del prossimo dato da popolare
   *
   * @returns {String} la proposizione articolata del prossimo dato da popolare o null
   */
  getProssimaProposizioneArticolata () {
    var dato = this._getProssimoDato()

    if (dato === null) {
      return null
    } else {
      return dato.getProposizioneArticolata()
    }
  }

  _getPrescrizioneElettronica (data) {
    var t = this

    return new Promise(async function (resolve, reject) {
      const varWebServicesHCup = new WebServicesHCup()
      const listaEsami = await varWebServicesHCup.getPrescrizioneElettronica(t._arrDati[0], t._arrDati[2])
      for (var esame of listaEsami) {
        esame['isPrenotato'] = false
      }
      resolve(listaEsami)
    })
      .catch(errore => {
        console.error(errore)
        return errore
      })
  }

  _popolaListaEsami () {
    var t = this
    return new Promise(async function (resolve, reject) {
      if (t._ultimiEsamiEstrattiDaRicetta === null) {
        t._ultimiEsamiEstrattiDaRicetta = await t._getPrescrizioneElettronica()
        resolve(true)
      } else {
        reject(new Error(false))
      }
    })
      .catch(errore => {
        console.error(errore)
        return false
      })
  }

  _getProssimoEsameDaPrenotare () {
    var t = this
    return new Promise(async function (resolve, reject) {
      var iEsami = 0
      var trovato = false
      var prossimoEsame = null

      if (t._ultimiEsamiEstrattiDaRicetta === null) {
        await t._popolaListaEsami()
      }

      if (t._ultimiEsamiEstrattiDaRicetta === null) {
        prossimoEsame = null
      } else {
        while (iEsami < t._ultimiEsamiEstrattiDaRicetta.length && trovato === false) {
          if (t._ultimiEsamiEstrattiDaRicetta[iEsami]['isPrenotato'] === false) {
            prossimoEsame = t._ultimiEsamiEstrattiDaRicetta[iEsami]
            trovato = true
          } else {
            iEsami = iEsami + 1
          }
        }
      }

      resolve(prossimoEsame)
    })
      .catch(errore => {
        console.error(errore)
        return null
      })
  }

  hasListaEsamiPopolata () {
    if (this._ultimiEsamiEstrattiDaRicetta === null) {
      return false
    } else {
      return true
    }
  }

  getDatiProssimoEsame () {
    var esame = this._getProssimoEsameDaPrenotare()

    if (esame === null) {
      return null
    } else {
      return esame
    }
  }

  async hasProssimoEsameDaPrenotare () {
    var esame = await this._getProssimoEsameDaPrenotare()

    if (esame === null) {
      return false
    } else {
      return true
    }
  }

  getListaDisponibilita () {
    var t = this

    return new Promise(async function (resolve, reject) {
      const varWebServicesHCup = new WebServicesHCup()
      var codCatalogoPrescr = ''
      const listaAppuntamenti = await varWebServicesHCup.getListaDisponibilita(codCatalogoPrescr, t.filtriAppuntamenti['data'], t.filtriAppuntamenti['citta'], t.filtriAppuntamenti['presidio'])
      resolve(listaAppuntamenti)
    })
      .catch(errore => {
        console.error(errore)
        return errore
      })
  }

  getNoteAvvertenze () {
    return new Promise(async function (resolve, reject) {
      const varWebServicesHCup = new WebServicesHCup()
      const noteAvvertenze = await varWebServicesHCup.getNoteAvvertenze()
      resolve(noteAvvertenze['noteAvvertenze'])
    })
      .catch(errore => {
        console.error(errore)
        return errore
      })
  }

  async prenotaEsame (isConfermato) {
    const varWebServicesHCup = new WebServicesHCup()
    var esame = await this._getProssimoEsameDaPrenotare()

    if (esame === null) {
      return false
    } else {
      this.filtriAppuntamenti = {
        'data': '',
        'citta': '',
        'presidio': ''
      }
      esame['isPrenotato'] = varWebServicesHCup.setPrenota(isConfermato)
      return esame['isPrenotato']
    }
  }
}

module.exports = Consultazione
