/**
 * Comprehensive Test Runner
 * Orchestrates all test categories for the multi-AI context system
 */

import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

interface TestSuite {
  name: string;
  pattern: string;
  timeout?: number;
  description: string;
}

const testSuites: TestSuite[] = [
  {
    name: 'Unit Tests',
    pattern: 'src/**/*.test.ts',
    timeout: 30000,
    description: 'Individual component and service tests',
  },
  {
    name: 'Integration Tests',
    pattern: 'src/test/integration/**/*.test.ts',
    timeout: 60000,
    description: 'Multi-component integration tests',
  },
  {
    name: 'Performance Tests',
    pattern: 'src/test/performance/**/*.test.ts',
    timeout: 120000,
    description: 'Performance and scalability tests',
  },
  {
    name: 'End-to-End Tests',
    pattern: 'src/test/e2e/**/*.test.ts',
    timeout: 180000,
    description: 'Complete user journey tests',
  },
  {
    name: 'Load Tests',
    pattern: 'src/test/load/**/*.test.ts',
    timeout: 300000,
    description: 'Concurrent usage and load tests',
  },
  {
    name: 'System Validation',
    pattern: 'src/test/system/**/*.test.ts',
    timeout: 120000,
    description: 'Requirements validation tests',
  },
];

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  output: string;
  error?: string;
}

class TestRunner {
  private results: TestResult[] = [];

  async runSuite(suite: TestSuite): Promise<TestResult> {
    console.log(`\n🧪 Running ${suite.name}...`);
    console.log(`📝 ${suite.description}`);
    console.log(`🎯 Pattern: ${suite.pattern}`);
    
    const startTime = performance.now();
    
    try {
      const command = `npx vitest run "${suite.pattern}" --reporter=verbose --timeout=${suite.timeout || 30000}`;
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: suite.timeout || 30000,
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`✅ ${suite.name} completed in ${duration.toFixed(2)}ms`);
      
      return {
        suite: suite.name,
        passed: true,
        duration,
        output,
      };
    } catch (error: any) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`❌ ${suite.name} failed after ${duration.toFixed(2)}ms`);
      console.log(`Error: ${error.message}`);
      
      return {
        suite: suite.name,
        passed: false,
        duration,
        output: error.stdout || '',
        error: error.message,
      };
    }
  }

  async runAll(): Promise<void> {
    console.log('🚀 Starting Comprehensive Test Suite for Multi-AI Context System');
    console.log('=' .repeat(80));
    
    const overallStartTime = performance.now();
    
    for (const suite of testSuites) {
      const result = await this.runSuite(suite);
      this.results.push(result);
    }
    
    const overallEndTime = performance.now();
    const totalDuration = overallEndTime - overallStartTime;
    
    this.printSummary(totalDuration);
  }

  async runSpecific(suiteName: string): Promise<void> {
    const suite = testSuites.find(s => s.name.toLowerCase() === suiteName.toLowerCase());
    
    if (!suite) {
      console.error(`❌ Test suite "${suiteName}" not found.`);
      console.log('Available suites:');
      testSuites.forEach(s => console.log(`  - ${s.name}`));
      return;
    }
    
    console.log(`🎯 Running specific test suite: ${suite.name}`);
    console.log('=' .repeat(50));
    
    const result = await this.runSuite(suite);
    this.results.push(result);
    
    this.printSummary(result.duration);
  }

  async runPerformanceOnly(): Promise<void> {
    console.log('⚡ Running Performance Test Suite Only');
    console.log('=' .repeat(50));
    
    const performanceSuites = testSuites.filter(s => 
      s.name.includes('Performance') || s.name.includes('Load')
    );
    
    const startTime = performance.now();
    
    for (const suite of performanceSuites) {
      const result = await this.runSuite(suite);
      this.results.push(result);
    }
    
    const endTime = performance.now();
    this.printSummary(endTime - startTime);
  }

  async runValidationOnly(): Promise<void> {
    console.log('✅ Running Validation Test Suite Only');
    console.log('=' .repeat(50));
    
    const validationSuites = testSuites.filter(s => 
      s.name.includes('System') || s.name.includes('Integration') || s.name.includes('End-to-End')
    );
    
    const startTime = performance.now();
    
    for (const suite of validationSuites) {
      const result = await this.runSuite(suite);
      this.results.push(result);
    }
    
    const endTime = performance.now();
    this.printSummary(endTime - startTime);
  }

  private printSummary(totalDuration: number): void {
    console.log('\n' + '=' .repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(80));
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    
    console.log(`\n📈 Overall Results:`);
    console.log(`   Total Suites: ${total}`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    
    if (passed === total) {
      console.log('\n🎉 ALL TESTS PASSED! The multi-AI context system is ready for deployment.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the results below:');
    }
    
    console.log('\n📋 Detailed Results:');
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const duration = (result.duration / 1000).toFixed(2);
      console.log(`   ${status} ${result.suite}: ${duration}s`);
      
      if (!result.passed && result.error) {
        console.log(`      Error: ${result.error.split('\n')[0]}`);
      }
    });
    
    if (failed > 0) {
      console.log('\n🔍 Failed Test Details:');
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`\n❌ ${result.suite}:`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
        if (result.output) {
          const lines = result.output.split('\n').slice(0, 10); // First 10 lines
          lines.forEach(line => console.log(`   ${line}`));
          if (result.output.split('\n').length > 10) {
            console.log('   ... (truncated)');
          }
        }
      });
    }
    
    console.log('\n' + '=' .repeat(80));
    
    // Performance insights
    if (this.results.some(r => r.suite.includes('Performance') || r.suite.includes('Load'))) {
      console.log('⚡ Performance Insights:');
      this.results
        .filter(r => r.suite.includes('Performance') || r.suite.includes('Load'))
        .forEach(result => {
          const avgTime = result.duration / 1000;
          if (avgTime > 60) {
            console.log(`   ⚠️  ${result.suite} took ${avgTime.toFixed(2)}s - consider optimization`);
          } else {
            console.log(`   ✅ ${result.suite} completed in ${avgTime.toFixed(2)}s - good performance`);
          }
        });
    }
    
    // Requirements coverage
    if (this.results.some(r => r.suite.includes('System'))) {
      console.log('\n📋 Requirements Coverage:');
      const systemResult = this.results.find(r => r.suite.includes('System'));
      if (systemResult?.passed) {
        console.log('   ✅ All system requirements validated successfully');
      } else {
        console.log('   ❌ Some system requirements failed validation');
      }
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new TestRunner();
  
  if (args.length === 0) {
    await runner.runAll();
  } else {
    const command = args[0].toLowerCase();
    
    switch (command) {
      case 'performance':
      case 'perf':
        await runner.runPerformanceOnly();
        break;
      case 'validation':
      case 'validate':
        await runner.runValidationOnly();
        break;
      case 'unit':
      case 'integration':
      case 'e2e':
      case 'load':
      case 'system':
        await runner.runSpecific(command);
        break;
      default:
        console.log('Usage: npm run test:comprehensive [command]');
        console.log('Commands:');
        console.log('  (no args)  - Run all test suites');
        console.log('  performance - Run performance tests only');
        console.log('  validation  - Run validation tests only');
        console.log('  unit        - Run unit tests only');
        console.log('  integration - Run integration tests only');
        console.log('  e2e         - Run end-to-end tests only');
        console.log('  load        - Run load tests only');
        console.log('  system      - Run system validation only');
        break;
    }
  }
  
  // Exit with appropriate code
  const failed = runner['results'].filter(r => !r.passed).length;
  process.exit(failed > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(console.error);
}

export { TestRunner, testSuites };