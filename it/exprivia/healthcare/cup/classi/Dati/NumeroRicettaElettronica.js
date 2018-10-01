'use strict'

var Dato = require('./Dato.js')

class NumeroRicettaElettronica extends Dato {
  constructor () {
    super(
      'Numero della Ricetta Elettronica',
      'il',
      'del',
      'https://api.glitch.com/chatcup/git/Immagini/presentazioneDati/RicettaElettronicaNumIndicato.jpg',
      /(?:\*|")(\w{5})(?:\n|.)*?(?:\*|")(\w{10})/g,
      /^160\w{2}\d{10}$/,
      'CCCCCCCCCCCCCCC'
    )
  }

  _checkValore (valore) {
    const regexp = RegExp(this.patternRegexStretta)

    valore = valore.toUpperCase()
    return (regexp.test(valore))
  }
}

module.exports = NumeroRicettaElettronica
