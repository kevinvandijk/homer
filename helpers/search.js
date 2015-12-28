import FuzzySearch from 'fuzzysearch-js';
import levenshteinFS from 'fuzzysearch-js/js/modules/LevenshteinFS';

const defaults = {
  minimumScore: 200,
  caseSensitive: false,
  returnEmptyArray: true,
  termPath: 'title',
};

export function fuzzySearch(list, searchValue, options) {
  options = Object.assign(defaults, options);

  try {
    const fuzzySearch = new FuzzySearch(list, options);
    fuzzySearch.addModule(levenshteinFS({'maxDistanceTolerance': 20, 'factor': 3}));

    const results = fuzzySearch.search(searchValue);

    return (results.length
      ? results.map(result => result.value)
      : null
    );
  } catch (e) {
    console.error(e);
    return null;
  }
}

export function normalSearch(list, searchValue, options) {
  options = Object.assign(defaults, options);

  return list.filter(item => {
    let itemValue = item[options.termPath];

    return (!options.caseSensitive
      ? itemValue.toLowerCase() === searchValue.toLowerCase()
      : itemValue === searchValue
    );
  });
}
