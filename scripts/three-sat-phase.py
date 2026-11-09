# Random 3-SAT phase transition: fraction satisfiable and DPLL branch count vs m/n.
# Usage: python3 scripts/three-sat-phase.py <n> <trials>  (fig 2 of the 3-SAT post used n = 20, 40, 60 and 200 trials)
import random, sys, json, statistics
sys.setrecursionlimit(10000)

def gen(n, m, rnd):
    return [tuple(v if rnd.random() < .5 else -v for v in rnd.sample(range(1, n + 1), 3)) for _ in range(m)]

def dpll(clauses, n):
    stats = [0]
    def solve(cls, assign):
        # unit propagation
        while True:
            unit = None
            new = []
            for c in cls:
                if any(assign.get(abs(l)) == (l > 0) for l in c): continue
                rest = [l for l in c if abs(l) not in assign]
                if not rest: return False
                if len(rest) == 1 and unit is None: unit = rest[0]
                new.append(rest)
            cls = new
            if not cls: return True
            if unit is None: break
            assign = {**assign, abs(unit): unit > 0}
        # branch on most frequent variable
        cnt = {}
        for c in cls:
            for l in c: cnt[abs(l)] = cnt.get(abs(l), 0) + 1
        v = max(cnt, key=cnt.get)
        stats[0] += 1
        return solve(cls, {**assign, v: True}) or solve(cls, {**assign, v: False})
    r = solve([list(c) for c in clauses], {})
    return r, stats[0]

n = int(sys.argv[1]); trials = int(sys.argv[2])
rnd = random.Random(7)
out = []
for i in range(0, 51):
    a = 2.0 + i * 0.1
    m = round(a * n)
    res = [dpll(gen(n, m, rnd), n) for _ in range(trials)]
    sat = sum(r for r, _ in res) / trials
    med = statistics.median(b for _, b in res)
    out.append([round(a, 2), round(sat, 3), med])
    print(a, sat, med, flush=True)
json.dump(out, open(f'phase-{n}.json', 'w'))
