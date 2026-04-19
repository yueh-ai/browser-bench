# browser-bench report

Total runs: 24

## Head-to-head scoreboard

| Task | agent-browser success | playwright-cli success | ab mean turns | pw mean turns | ab mean ms | pw mean ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| auth-modal | 100% (2) | 100% (2) | 7.0 | 10.0 | 60308 | 87000 |
| cascading-dropdowns | 100% (2) | 100% (2) | 9.5 | 13.5 | 15804 | 127500 |
| form-fill | 100% (2) | 100% (2) | 3.5 | 9.0 | 15428 | 47088 |
| multi-tab | 100% (2) | 100% (2) | 4.5 | 4.0 | 28646 | 0 |
| virtualized-scroll | 100% (2) | 100% (2) | 4.5 | 6.0 | 56972 | 34728 |
| visual-mismatch | 100% (2) | 100% (2) | 5.5 | 5.5 | 41856 | 60000 |

## Per-scenario detail

### auth-modal — Login + modal + date picker
**Goal:** Log in as user admin password hunter2, open the Book appointment modal, set the date to 2026-05-20, and confirm.

**Predicted winner:** agent-browser

| Tool | K | success | mean/med/p90 turns | mean ms | distinct cmds | top failure tokens |
| --- | ---: | ---: | --- | ---: | ---: | --- |
| agent-browser | 2 | 100% | 7.0 / 7.0 / 7.0 | 60308 | 4 |  |
| playwright-cli | 2 | 100% | 10.0 / 10.0 / 10.8 | 87000 | 4 |  |

**Sample agent-browser commands:**
```
#SUCCESS
open http://localhost:3000/auth?sid=bench-auth-modal-agent-browser-0
snapshot -i
batch fill @e2 admin | fill @e3 hunter2 | click @e4
snapshot -i
batch click @e2 | snapshot -i
batch fill @e4 2026-05-20 | click @e6 | snapshot -i
eval document.body.innerText
```
**Sample playwright-cli commands:**
```
#SUCCESS
open http://localhost:3000/auth?sid=bench-auth-modal-playwright-cli-0
snapshot
fill e5 "admin"
fill e7 "hunter2"
click e8
snapshot
click e4
snapshot
```

### cascading-dropdowns — Cascading async dropdowns
**Goal:** Set Country to United States, State to California, City to San Francisco, then click Submit location.

**Predicted winner:** playwright-cli

| Tool | K | success | mean/med/p90 turns | mean ms | distinct cmds | top failure tokens |
| --- | ---: | ---: | --- | ---: | ---: | --- |
| agent-browser | 2 | 100% | 9.5 / 9.5 / 9.9 | 15804 | 5 |  |
| playwright-cli | 2 | 100% | 13.5 / 13.5 / 14.7 | 127500 | 3 |  |

**Sample agent-browser commands:**
```
#SUCCESS
AGENT_BROWSER_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome AGENT_BROWSER_SESSION=bench-cascading-dropdowns-agent-browser-0 /home/user/browser-bench/.npm-global/bin/agent-browser --json open "http://localhost:3000/dropdowns?sid=bench-cascading-dropdowns-agent-browser-0"
AGENT_BROWSER_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome AGENT_BROWSER_SESSION=bench-cascading-dropdowns-agent-browser-0 /home/user/browser-bench/.npm-global/bin/agent-browser --json snapshot -i
AGENT_BROWSER_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome AGENT_BROWSER_SESSION=bench-cascading-dropdowns-agent-browser-0 /home/user/browser-bench/.npm-global/bin/agent-browser --json batch "click @e3" "snapshot -i"
AGENT_BROWSER_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome AGENT_BROWSER_SESSION=bench-cascading-dropdowns-agent-browser-0 /home/user/browser-bench/.npm-global/bin/agent-browser --json batch "click @e6" "click @e4" "snapshot -i"
AGENT_BROWSER_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome AGENT_BROWSER_SESSION=bench-cascading-dropdowns-agent-browser-0 /home/user/browser-bench/.npm-global/bin/agent-browser --json batch "click @e4" "eval \"document.getElementById('dd-state').classList.toString() + ' | menu: ' + document.getElementById('state-menu').innerHTML\""
AGENT_BROWSER_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome AGENT_BROWSER_SESSION=bench-cascading-dropdowns-agent-browser-0 /home/user/browser-bench/.npm-global/bin/agent-browser --json snapshot -i
AGENT_BROWSER_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome AGENT_BROWSER_SESSION=bench-cascading-dropdowns-agent-browser-0 /home/user/browser-bench/.npm-global/bin/agent-browser --json batch "click @e6" "click @e5" "snapshot -i"
AGENT_BROWSER_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome AGENT_BROWSER_SESSION=bench-cascading-dropdowns-agent-browser-0 /home/user/browser-bench/.npm-global/bin/agent-browser --json snapshot -i
```
**Sample playwright-cli commands:**
```
#SUCCESS
open http://localhost:3000/dropdowns?sid=bench-cascading-dropdowns-playwright-cli-0
snapshot
click e4
snapshot
click e7
click e11
snapshot
click e13
```

### form-fill — Static form fill (6 fields)
**Goal:** Fill the registration form with First name Ada, Last name Lovelace, Email ada@example.com, Phone +1-555-0100, Country United Kingdom, and check the Subscribe box. Submit the form.

**Predicted winner:** agent-browser

| Tool | K | success | mean/med/p90 turns | mean ms | distinct cmds | top failure tokens |
| --- | ---: | ---: | --- | ---: | ---: | --- |
| agent-browser | 2 | 100% | 3.5 / 3.5 / 3.9 | 15428 | 2 |  |
| playwright-cli | 2 | 100% | 9.0 / 9.0 / 9.0 | 47088 | 6 |  |

**Sample agent-browser commands:**
```
#SUCCESS
date +%s%3N && AGENT_BROWSER_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome AGENT_BROWSER_SESSION=bench-form-fill-agent-browser-0 /home/user/browser-bench/.npm-global/bin/agent-browser --json open "http://localhost:3000/form?sid=bench-form-fill-agent-browser-0"
AGENT_BROWSER_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome AGENT_BROWSER_SESSION=bench-form-fill-agent-browser-0 /home/user/browser-bench/.npm-global/bin/agent-browser --json snapshot -i
AGENT_BROWSER_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome AGENT_BROWSER_SESSION=bench-form-fill-agent-browser-0 /home/user/browser-bench/.npm-global/bin/agent-browser --json batch "fill @e2 \"Ada\"" "fill @e3 \"Lovelace\"" "fill @e4 \"ada@example.com\"" "fill @e5 \"+1-555-0100\"" "select @e6 \"United Kingdom\"" "check @e7" "click @e8"
AGENT_BROWSER_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome AGENT_BROWSER_SESSION=bench-form-fill-agent-browser-0 /home/user/browser-bench/.npm-global/bin/agent-browser --json snapshot -i && date +%s%3N
```
**Sample playwright-cli commands:**
```
#SUCCESS
open "http://localhost:3000/form?sid=bench-form-fill-playwright-cli-0"
snapshot
fill e5 "Ada"
fill e7 "Lovelace"
fill e9 "ada@example.com"
fill e11 "+1-555-0100"
select e13 "United Kingdom"
check e15
```

### multi-tab — Multi-tab data aggregation (5 pages)
**Goal:** Visit each of the 5 product pages linked from the list, sum the prices you observe, and POST the total to /api/total?sid=<sid> as JSON {"total": <number>} using the browser tool's JS eval (fetch). Report the final total in your summary.

**Predicted winner:** agent-browser

| Tool | K | success | mean/med/p90 turns | mean ms | distinct cmds | top failure tokens |
| --- | ---: | ---: | --- | ---: | ---: | --- |
| agent-browser | 2 | 100% | 4.5 / 4.5 / 4.9 | 28646 | 3 |  |
| playwright-cli | 2 | 100% | 4.0 / 4.0 / 4.0 | 0 | 3 |  |

**Sample agent-browser commands:**
```
#SUCCESS
open http://localhost:3000/products?sid=bench-multi-tab-agent-browser-0
eval Array.from(document.querySelectorAll('a'))...
eval fetch each /products/1..5 and extract prices
eval POST /api/total with {total:86.84}
```
**Sample playwright-cli commands:**
```
#SUCCESS
open http://localhost:3000/products?sid=bench-multi-tab-playwright-cli-0
snapshot
eval fetch all 5 product pages
eval POST /api/total total=86.84
```

### virtualized-scroll — Virtualized infinite scroll (200 items, ~10 in DOM)
**Goal:** A target index is stored at window.__TARGET_INDEX on the page. Find the list item whose number equals that index, read its data-secret attribute, and POST it to /api/secret?sid=<sid> as JSON {"secret": <value>}.

**Predicted winner:** toss-up

| Tool | K | success | mean/med/p90 turns | mean ms | distinct cmds | top failure tokens |
| --- | ---: | ---: | --- | ---: | ---: | --- |
| agent-browser | 2 | 100% | 4.5 / 4.5 / 4.9 | 56972 | 2 |  |
| playwright-cli | 2 | 100% | 6.0 / 6.0 / 6.0 | 34728 | 2 |  |

**Sample agent-browser commands:**
```
#SUCCESS
open http://localhost:3000/scroll?sid=bench-virtualized-scroll-agent-browser-0
eval window.__TARGET_INDEX
eval dump body innerHTML
eval scroll viewport to index 173 and read data-secret
eval POST /api/secret with secret=24393b4e
```
**Sample playwright-cli commands:**
```
#SUCCESS
open http://localhost:3000/scroll?sid=bench-virtualized-scroll-playwright-cli-0
eval window.__TARGET_INDEX
eval find data-index=173 (not rendered, 11 items)
eval find scroll container (#viewport, sh=8000, ch=400)
eval scroll viewport to 173*40-100 and read data-secret
eval POST /api/secret with {secret: d98c5cb6}
```

### visual-mismatch — Visual / aria disagreement
**Goal:** Click the only button that is both visually enabled AND not aria-disabled. Then confirm the action by clicking the 'I'm sure' button that appears.

**Predicted winner:** toss-up

| Tool | K | success | mean/med/p90 turns | mean ms | distinct cmds | top failure tokens |
| --- | ---: | ---: | --- | ---: | ---: | --- |
| agent-browser | 2 | 100% | 5.5 / 5.5 / 5.9 | 41856 | 4 |  |
| playwright-cli | 2 | 100% | 5.5 / 5.5 / 5.9 | 60000 | 4 |  |

**Sample agent-browser commands:**
```
#SUCCESS
open http://localhost:3000/visual?sid=bench-visual-mismatch-agent-browser-0
snapshot -i
eval inspect buttons
click @e4 (Delete)
snapshot -i
click @e5 (I'm sure)
snapshot -i
```
**Sample playwright-cli commands:**
```
#SUCCESS
open http://localhost:3000/visual?sid=bench-visual-mismatch-playwright-cli-0
snapshot
eval inspect buttons
click e6 (Delete)
snapshot
click e8 (I'm sure)
```

