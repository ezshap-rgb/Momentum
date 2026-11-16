# User Experience & Product Design

## 1. Primary Screens & Views

### 1.1. Giant DO Screen (Default Launch View)
* **Visuals:** Deep slate background with a glowing, gently breathing purple/indigo circular DO button.
* **Header Elements:** App brand icon, Bench button, Experiments button, Vault button, Live Sync indicator, Task View link, Settings cog.
* **Interaction:** Exactly 1 primary tap target. Tapping DO triggers the Physical Ignition screen.

### 1.2. Physical Ignition Screen
* **Visuals:** Exercise card with large rep counter (e.g. `10 Push-ups`), amber flame badge.
* **Controls:**
  * Huge `Done →` primary bridge button.
  * Micro controls: `Fewer reps` (scales reps by 40% and logs silent -1 energy shift) and `Swap` (cycles to squats, crunches, jumping jacks).
* **Habit Crediting:** Ignition reps automatically credit your matching daily circuit quota!

### 1.3. Action Offer Screen (Assigned vs. Paired Mode)
* **Assigned Mode (1-Card):**
  * Displays friction badge, time bucket, title, and big `Start` button.
  * Micro controls: `Smaller part`, `Bigger part`, `Not now`.
  * `Why this?` drawer explaining exact algorithm ranking reasons.
* **Paired Mode (2-Cards):**
  * Upper card: Target $+1$ friction with *More Reward* badge and watch part vector preview.
  * Lower card: Target $-1$ friction with *Easier Entry* badge and watch part vector preview.
  * Prioritizes actions from different projects to ensure variety.
  * `Neither right now (Not now)` control supporting standard tap and hold-to-confirm long-press.

### 1.4. Action Execution Screen
* **Visuals:** Live stopwatch timer, action title, and green `Complete ✓` button.
* **ADHD Rescue Controls:**
  * `Stuck? Shrink`: Drops into micro first step to break resistance.
  * `Parking Lot`: Thought-dumping modal to safely store sudden distractions without derailing the current task.
  * `Done for now ✓`: Appears after 2+ completed tasks to allow guilt-free stopping.

### 1.5. Watchmaker's Bench Modal
* **Visuals:** 10 part slots revealing as daily work points accumulate, plus 5 stretch jewel slots for extra accomplishments.
* **Components:** Animated 7-gear train showing rolling momentum and a 0–100 power reserve gauge.
* **Safety Valve:** `Fresh Start Today` button resets daily counter with zero penalty.

### 1.6. Plan Mode Screen (Phone & Desktop)
* **Phone:** Bottom navigation tabs (Today, Pool, Week, Review) with a persistent floating DO button.
* **Desktop:** Sidebar navigation + two-panel review layout + live desktop status panel refreshing every 60s reminding *"Do mode runs on your phone."*
* **Pool & Action Correction:** Tapping any action opens an inline editor to adjust friction, importance, due date, context, and first micro-step.

### 1.7. Watchmaker's Collection Vault
* **Visuals:** SVG vector graphic of the assembled mechanical timepiece (case, dial, hands, crystal).
* **Vault:** Gallery of completed collector's chronometers celebrating long-term consistency.

---

## 2. Interaction & Visual Design Principles
1. **Zero Lists in DO Mode:** Never force an executive decision between items on a list.
2. **Warm, Dignified Mechanical Metaphor:** Watchmaking parts, brass gears, and polished jewels instead of childish gamification or gaming badges.
3. **No Red Overdue Banners:** Overdue items become functional watch parts; missed days never trigger shame or guilt.
4. **Instant Response (<5ms):** Taps yield immediate visual feedback, audio chime, and optional haptics.
