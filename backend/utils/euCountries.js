const EU_COUNTRIES = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Republic",
  "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary",
  "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands",
  "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden"
];

const isEUCountry = (countryStr) => {
  if (!countryStr) return false;
  return EU_COUNTRIES.includes(countryStr.trim());
};

module.exports = { EU_COUNTRIES, isEUCountry };
