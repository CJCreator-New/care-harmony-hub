import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

interface TestExecutionRequest {
  script: string
  baseUrl?: string
  headless?: boolean
  timeout?: number
  testName?: string
}

interface TestExecutionResponse {
  id: string
  status: 'Passed' | 'Failed'
  duration: number
  logs: string
  error?: string
  timestamp: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { script, baseUrl = 'http://localhost:8080', headless = true, timeout = 30000, testName = 'Generated Test' }: TestExecutionRequest = await req.json()

    if (!script) {
      return new Response(
        JSON.stringify({ error: 'Script content is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = Date.now()

    console.log(`Starting test execution: ${executionId}`)

    // Create a temporary Python script file
    const scriptPath = `/tmp/${executionId}.py`

    // Write the script to a temporary file
    const scriptContent = `
import asyncio
import sys
import os
import json
from playwright.async_api import async_playwright, expect
import pytest

async def run_test():
    results = {
        'id': '${executionId}',
        'status': 'Passed',
        'logs': '',
        'error': None,
        'duration': 0
    }

    start_time = asyncio.get_event_loop().time()

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=${headless})
            context = await browser.new_context()
            page = await context.new_page()

            # Set default timeout
            page.set_default_timeout(${timeout})

            results['logs'] += f"Browser launched successfully\\n"
            results['logs'] += f"Navigating to ${baseUrl}\\n"

            # Execute the generated script
            ${script.replace(/from playwright\.sync_api import sync_playwright, expect/g, '').replace(/def test_.*\(\):/g, 'async def main_test():')}

            # If the script doesn't have an explicit main function, wrap it
            if 'async def main_test():' not in '''${script}''':
                # Execute the script directly
                exec('''${script.replace(/\n/g, '\\n').replace(/'/g, "\\'")}''')
            else:
                await main_test()

            results['logs'] += "Test completed successfully\\n"

    except Exception as e:
        results['status'] = 'Failed'
        results['error'] = str(e)
        results['logs'] += f"Test failed: {str(e)}\\n"
        print(f"Test execution error: {e}", file=sys.stderr)

    finally:
        end_time = asyncio.get_event_loop().time()
        results['duration'] = int((end_time - start_time) * 1000)

        # Cleanup
        try:
            if 'browser' in locals():
                await browser.close()
        except:
            pass

    return results

if __name__ == "__main__":
    result = asyncio.run(run_test())
    print(json.dumps(result))
`

    // Execute the Python script
    const cmd = new Deno.Command("python3", {
      args: ["-c", scriptContent],
      stdout: "piped",
      stderr: "piped",
    })

    const process = cmd.spawn()
    const { code, stdout, stderr } = await process.output()

    const stdoutText = new TextDecoder().decode(stdout)
    const stderrText = new TextDecoder().decode(stderr)

    console.log(`Python execution completed with code: ${code}`)
    console.log(`stdout: ${stdoutText}`)
    console.log(`stderr: ${stderrText}`)

    let result: TestExecutionResponse

    if (code === 0 && stdoutText.trim()) {
      try {
        const parsedResult = JSON.parse(stdoutText.trim())
        result = {
          id: parsedResult.id || executionId,
          status: parsedResult.status || 'Failed',
          duration: parsedResult.duration || Date.now() - startTime,
          logs: parsedResult.logs || stdoutText,
          error: parsedResult.error,
          timestamp: new Date().toISOString()
        }
      } catch (parseError) {
        // If JSON parsing fails, create result from raw output
        result = {
          id: executionId,
          status: code === 0 ? 'Passed' : 'Failed',
          duration: Date.now() - startTime,
          logs: stdoutText || 'Test executed successfully',
          error: stderrText || undefined,
          timestamp: new Date().toISOString()
        }
      }
    } else {
      result = {
        id: executionId,
        status: 'Failed',
        duration: Date.now() - startTime,
        logs: stdoutText || 'No output',
        error: stderrText || 'Script execution failed',
        timestamp: new Date().toISOString()
      }
    }

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})