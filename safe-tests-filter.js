
// TODO: put here a list of tests that should NOT be run on CI.
// For example: tests that require API tokens that are not available on GitHub Actions.
const EXCLUDED_TESTS = [
  'unsafe.service', 
];





module.exports = (path_list) => {
  console.log('\nFiltering-out tests that require auth tokens');
  const filtered_paths = path_list.filter(
    (path) => !EXCLUDED_TESTS.some((tn) => path.includes(tn)),
  );

  return {
    filtered: filtered_paths.map((p) => ({
      test: p,
    })),
  };
};
