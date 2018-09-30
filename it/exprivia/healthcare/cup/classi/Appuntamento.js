'use strict'

class Appuntamento {
  constructor (nomeEsame, data, ora, citta, presidio) {
    this.nomeEsame = nomeEsame
    this.data = data
    this.ora = ora
    this.citta = citta
    this.presidio = presidio
  }

  getNomeEsame () {
    return this.nomeEsame
  }

  getData () {
    return this.data
  }

  getOra () {
    return this.ora
  }

  getCitta () {
    return this.citta
  }

  getPresidio () {
    return this.presidio
  }
}

module.exports = Appuntamento
