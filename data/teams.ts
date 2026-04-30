export const teams = {
  lunch: {
    name: 'Equipe Lunch Dog',
    logo: '/logos/lunch.png',
    maxPrize: 10000,
    base2025: {
      jan: 290.742,
      fev: 279.268,
      mar: 276.908,
      abr: 295.452,
      mai: 304.513,
      jun: 318.971,
    },
  },
  varejo: {
    name: 'Equipe Varejo',
    logo: '/logos/snack.png',
    maxPrize: 5000,
    base2025: {
      jan: 55.976,
      fev: 57.554,
      mar: 56.587,
      abr: 54.548,
      mai: 53.985,
      jun: 39.957,
    },
  },

  imbramil: {
    name: 'Equipe Imbramil',
    logo: '/logos/imbramil.png',
    maxPrize: 5000,
    base2025: {
      jan: 55.997,
      fev: 68.847,
      mar: 45.195,
      abr: 63.975,
      mai: 56.579,
      jun: 56.579,
    },
    base2025S2: {
      jul: 59.060,
      ago: 55.470,
      set: 60.526,
      out: 63.056,
      nov: 54.386,
      dez: 38.724,
    },
  },
} as const
