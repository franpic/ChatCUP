'use strict'

var Dato = require('./Dato.js')

class NumeroTesseraSanitaria extends Dato {
  constructor () {
    super(
      'Numero della Tessera Sanitaria',
      'il',
      'del',
      'https://raw.githubusercontent.com/franpic/ChatCUP/master/Immagini/presentazioneDati/TesseraSanitariaNumIndicato.jpg',
      /\w{20}/g,
      /^\d{20}$/,
      'CCCCCCCCCCCCCCCCCCCC'
    )
  }

  _checkValore (valore) {
    const regexp = RegExp(this.regexStretta)

    valore = valore.toUpperCase()
    return (regexp.test(valore))
  }
}

module.exports = NumeroTesseraSanitaria
