'use strict'

var Dato = require('./Dato.js')

class CodiceFiscale extends Dato {
  constructor () {
    super(
      'Codice Fiscale',
      'il',
      'del',
      'https://raw.githubusercontent.com/franpic/ChatCUP/master/Immagini/presentazioneDati/TesseraSanitariaCfIndicato.jpg',
      /\w{16}/g,
      /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/,
      'LLLLLLCCLCCLCCCL'
    )
  }

  _checkValore (valore) {
    console.log('entrato in _checkValore in CodiceFiscale con valore ' + valore)
    var regexp = new RegExp(this.patternRegexStretta)

    if (regexp.test(valore) === false) {
      return false
    } else {
      var set1 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      var set2 = 'ABCDEFGHIJABCDEFGHIJKLMNOPQRSTUVWXYZ'
      var setpari = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      var setdisp = 'BAKPLCQDREVOSFTGUHMINJWZYX'
      var s = 0
      var i = 1

      for (i = 1; i <= 13; i += 2) {
        s = s + setpari.indexOf(set2.charAt(set1.indexOf(valore.charAt(i))))
      }
      for (i = 0; i <= 14; i += 2) {
        s = s + setdisp.indexOf(set2.charAt(set1.indexOf(valore.charAt(i))))
      }
      if (s % 26 !== valore.charCodeAt(15) - 'A'.charCodeAt(0)) {
        return false
      }
      return true
    }
  }
}

module.exports = CodiceFiscale
