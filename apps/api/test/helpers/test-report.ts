export interface TestResult {
  scenario: string;
  status: 'PASSED' | 'FAILED';
}

export function createScenarioTracker(results: TestResult[]) {
  return function trackScenario(
    scenario: string,
    testFn: () => Promise<void>,
  ): () => Promise<void> {
    return async () => {
      try {
        await testFn();
        results.push({ scenario, status: 'PASSED' });
      } catch (error) {
        results.push({ scenario, status: 'FAILED' });
        throw error;
      }
    };
  };
}

export function printTestReport(
  title: string,
  results: TestResult[],
  formatter?: (scenario: string) => string,
): void {
  const passed = results.filter((result) => result.status === 'PASSED');
  const failed = results.filter((result) => result.status === 'FAILED');

  console.log('\n=====================================');
  console.log(title);
  console.log('=====================================');

  for (const result of results) {
    const label = formatter ? formatter(result.scenario) : result.scenario;
    const icon = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} ${label}`);
  }

  console.log('=====================================');
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log('=====================================\n');
}
