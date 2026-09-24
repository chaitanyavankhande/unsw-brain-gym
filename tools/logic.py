"""Tiny propositional-logic engine used to machine-check lesson answers.

Formula syntax (same symbols the lessons show):
    variables   : letters/words starting with a letter, e.g. p, q, A, below0
    constants   : ⊤ (true), ⊥ (false)
    not         : ¬  (also ~ or !)
    and         : ∧  (also &)
    or          : ∨  (also |)
    xor         : ⊕  (also ^)
    implies     : ⇒  (also -> or →)   right-associative
    iff         : ⇔  (also <-> or ↔)
    brackets    : ( )

Binding, tightest first: ¬, ∧, ∨, ⊕, ⇒, ⇔.
(The COMP9020 slides only fix ¬ > {∧,∨} > {⇒,⇔}; lessons always bracket mixes of ∧ and ∨,
so the extra ordering here never decides a lesson's meaning.)
"""
from itertools import product
import re

_TOKEN = re.compile(r"\s*(<->|->|[¬~!∧&∨|⊕^⇒→⇔↔()⊤⊥]|[A-Za-z][A-Za-z0-9_]*)")
_ALIASES = {"~": "¬", "!": "¬", "&": "∧", "|": "∨", "^": "⊕", "->": "⇒", "→": "⇒", "<->": "⇔", "↔": "⇔"}
_BINARY = [("⇔", "left"), ("⇒", "right"), ("⊕", "left"), ("∨", "left"), ("∧", "left")]  # loosest → tightest


def tokenize(s):
    s = s.replace("`", "").strip()
    pos, out = 0, []
    while pos < len(s):
        m = _TOKEN.match(s, pos)
        if not m or m.end() == pos:
            raise ValueError(f"Can't read formula {s!r} at position {pos}: {s[pos:pos + 10]!r}")
        tok = m.group(1)
        out.append(_ALIASES.get(tok, tok))
        pos = m.end()
    return out


class _Parser:
    def __init__(self, text):
        self.text = text
        self.toks = tokenize(text)
        self.i = 0

    def peek(self):
        return self.toks[self.i] if self.i < len(self.toks) else None

    def take(self, want=None):
        t = self.peek()
        if t is None or (want and t != want):
            raise ValueError(f"In {self.text!r}: expected {want or 'more'}, got {t!r}")
        self.i += 1
        return t

    def parse(self):
        node = self.level(0)
        if self.peek() is not None:
            raise ValueError(f"In {self.text!r}: unexpected {self.peek()!r}")
        return node

    def level(self, k):
        if k == len(_BINARY):
            return self.unary()
        op, assoc = _BINARY[k]
        left = self.level(k + 1)
        if assoc == "right":
            if self.peek() == op:
                self.take(op)
                return (op, left, self.level(k))
            return left
        while self.peek() == op:
            self.take(op)
            left = (op, left, self.level(k + 1))
        return left

    def unary(self):
        t = self.peek()
        if t == "¬":
            self.take()
            return ("¬", self.unary())
        if t == "(":
            self.take("(")
            node = self.level(0)
            self.take(")")
            return node
        if t in ("⊤", "⊥"):
            self.take()
            return ("const", t == "⊤")
        if t and re.match(r"[A-Za-z]", t):
            self.take()
            return ("var", t)
        raise ValueError(f"In {self.text!r}: unexpected {t!r}")


def parse(text):
    """Parse a formula. Text starting with `BA:` is read as Boolean-algebra notation (see parse_ba)."""
    t = text.replace("`", "").strip()
    if t.startswith("BA:"):
        return parse_ba(t[3:])
    return _Parser(text).parse()


# ---------------------------------------------------------------------------
# Boolean-algebra notation (COMP9020 Week 2):  x + y  (or),  x·y / xy  (and),  x′ / x'  (not), 0, 1
# Variables are ONE letter, optionally followed by digits (x1, w2), so `xy` means x·y.
# Binding: ′ (postfix) tightest, then · / juxtaposition, then +.
_BA_TOKEN = re.compile(r"\s*([A-Za-z][0-9]*|[01]|[+·*.()]|′|'|’)")


def parse_ba(text):
    s = text.replace("`", "").strip()
    toks, pos = [], 0
    while pos < len(s):
        m = _BA_TOKEN.match(s, pos)
        if not m or m.end() == pos:
            if s[pos:].strip() == "":
                break
            raise ValueError(f"Can't read BA expression {s!r} at {pos}: {s[pos:pos + 10]!r}")
        t = m.group(1)
        toks.append("′" if t in ("'", "’") else ("·" if t in ("*", ".") else t))
        pos = m.end()
    i = 0

    def peek():
        return toks[i] if i < len(toks) else None

    def take(want=None):
        nonlocal i
        t = peek()
        if t is None or (want and t != want):
            raise ValueError(f"In BA {s!r}: expected {want or 'more'}, got {t!r}")
        i += 1
        return t

    def summ():
        node = prod()
        while peek() == "+":
            take("+")
            node = ("∨", node, prod())
        return node

    def starts_atom(t):
        return t is not None and (t == "(" or t in ("0", "1") or re.match(r"[A-Za-z]", t))

    def prod():
        node = post()
        while True:
            if peek() == "·":
                take("·")
                node = ("∧", node, post())
            elif starts_atom(peek()):
                node = ("∧", node, post())
            else:
                return node

    def post():
        node = atom()
        while peek() == "′":
            take("′")
            node = ("¬", node)
        return node

    def atom():
        t = peek()
        if t == "(":
            take("(")
            node = summ()
            take(")")
            return node
        if t in ("0", "1"):
            take()
            return ("const", t == "1")
        if t and re.match(r"[A-Za-z]", t):
            take()
            return ("var", t)
        raise ValueError(f"In BA {s!r}: unexpected {t!r}")

    node = summ()
    if peek() is not None:
        raise ValueError(f"In BA {s!r}: unexpected {peek()!r}")
    return node


def variables(node, acc=None):
    acc = set() if acc is None else acc
    kind = node[0]
    if kind == "var":
        acc.add(node[1])
    elif kind == "const":
        pass
    elif kind == "¬":
        variables(node[1], acc)
    else:
        variables(node[1], acc)
        variables(node[2], acc)
    return acc


def evaluate(node, env):
    kind = node[0]
    if kind == "var":
        return env[node[1]]
    if kind == "const":
        return node[1]
    if kind == "¬":
        return not evaluate(node[1], env)
    a, b = evaluate(node[1], env), evaluate(node[2], env)
    return {"∧": a and b, "∨": a or b, "⊕": a != b, "⇒": (not a) or b, "⇔": a == b}[kind]


def rows(names):
    names = sorted(names)
    for vals in product([False, True], repeat=len(names)):
        yield dict(zip(names, vals))


def equivalent(f, g):
    F, G = parse(f), parse(g)
    for env in rows(variables(F) | variables(G)):
        if evaluate(F, env) != evaluate(G, env):
            return False, env
    return True, None


def valid(f):
    F = parse(f)
    for env in rows(variables(F)):
        if not evaluate(F, env):
            return False, env
    return True, None


def falsifying(f, names=None):
    F = parse(f)
    names = set(names or []) | variables(F)
    return [env for env in rows(names) if not evaluate(F, env)]


def entails(premises, f):
    P = [parse(p) for p in premises]
    F = parse(f)
    names = set().union(*[variables(p) for p in P]) | variables(F)
    for env in rows(names):
        if all(evaluate(p, env) for p in P) and not evaluate(F, env):
            return False, env
    return True, None


def value(f):
    F = parse(f)
    if variables(F):
        raise ValueError(f"{f!r} has variables; 'value' checks need ⊤/⊥ only")
    return evaluate(F, {})
