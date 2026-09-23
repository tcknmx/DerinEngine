"""
DerinEngine - Time-based Tween (Interpolation) Engine
=================================================================================
Lightweight, engine-agnostic tween engine focused on 2D/3D. Smoothly changes
any numeric property of a Game(object) over time.

Usage:
    from deep_engine.tween import TweenComponent
    tc = gobj.add_component(TweenComponent())
    tc.to(sprite, "color", (255, 0, 0), 0.5)              # color
    t = tc.to(other, "position.x", 300.0, 1.0, ease="out_bounce")
    tc.to_vec(other, "position", Vector2(300, 200), 1.0) # position vector
    tc.after(t).to(other, "position.y", 100.0, 0.4)       # sequential (chain)

Easing: "linear", "in", "out", "in_out", "out_bounce", "out_elastic",
        "out_back", "in_cubic" ... (see the EASING dict).

This engine uses the "Component" API (advances with update(dt)), so it is
independent of the game/Scene and portable to 3D.
"""

import math
from .components import Component
from .math2d import Vector2


# ----------------------------------------------------------------------------
# Easing functions -- t: 0..1 -> output value
# ----------------------------------------------------------------------------
def ease_linear(t):
    return min(1.0, max(0.0, t))


def ease_in(t):
    t = min(1.0, max(0.0, t))
    return t * t


def ease_out(t):
    t = min(1.0, max(0.0, t))
    return 1.0 - (1.0 - t) * (1.0 - t)


def ease_in_out(t):
    t = min(1.0, max(0.0, t))
    if t < 0.5:
        return 2.0 * t * t
    return 1.0 - ((-2.0 * t + 2.0) ** 2) / 2.0


def ease_in_cubic(t):
    t = min(1.0, max(0.0, t))
    return t * t * t


def ease_out_cubic(t):
    t = min(1.0, max(0.0, t))
    return 1.0 - (1.0 - t) ** 3


def ease_out_bounce(t):
    t = min(1.0, max(0.0, t))
    n1, d1 = 7.5625, 2.75
    if t < 1.0 / d1:
        return n1 * t * t
    elif t < 2.0 / d1:
        t -= 1.5 / d1
        return n1 * t * t + 0.75
    elif t < 2.5 / d1:
        t -= 2.25 / d1
        return n1 * t * t + 0.9375
    t -= 2.625 / d1
    return n1 * t * t + 0.984375


def ease_out_elastic(t):
    t = min(1.0, max(0.0, t))
    c4 = (2.0 * math.pi) / 3.0
    if t == 0 or t == 1:
        return t
    return 2 ** (-10 * t) * math.sin((t * 10 - 0.75) * c4) + 1.0


def ease_out_back(t):
    t = min(1.0, max(0.0, t))
    c1, c3 = 1.70158, 2.70158
    return 1.0 + c3 * (t - 1.0) ** 3 + c1 * (t - 1.0) ** 2


EASING = {
    "linear": ease_linear,
    "in": ease_in,
    "out": ease_out,
    "in_out": ease_in_out,
    "in_cubic": ease_in_cubic,
    "out_cubic": ease_out_cubic,
    "out_bounce": ease_out_bounce,
    "out_elastic": ease_out_elastic,
    "out_back": ease_out_back,
}


def _get_easing(ease):
    """Resolves an easing as either a string name or a callable function."""
    if callable(ease):
        return ease
    return EASING.get(ease, ease_linear)


# ----------------------------------------------------------------------------
# Value mixing (float / Vector2 / color tuple)
# ----------------------------------------------------------------------------
def _mix(start, end, t):
    """Linear interpolation from start->end with the same t. Supports float, Vector2 or color tuple."""
    if isinstance(end, Vector2):
        return Vector2(
            start.x + (end.x - start.x) * t,
            start.y + (end.y - start.y) * t,
        )
    if isinstance(end, (tuple, list)):
        return tuple(max(0, min(255, int(start[i] + (end[i] - start[i]) * t)))
                     for i in range(len(end)))
    return start + (end - start) * t


class Tween:
    """Represents a single time-based change.

    - source: the target object (any object, such as a GameObject, Component or Vector2)
    - attr:   string path ("position.x", "color", "scale.y" etc.; dot-separated for depth)
    - end:    the target value (float / Vector2 / color tuple). The start value is read
              automatically from the source when the tween begins (or given via from_).
    - duration: duration in seconds.
    - ease:   easing name or function.
    - on_complete: called when it finishes.
    """

    def __init__(self, source, attr, end, duration, ease="linear",
                 from_=None, on_complete=None):
        self.source = source
        self.attr = attr
        self.end = end
        self.duration = max(0.0001, duration)
        self.ease = _get_easing(ease)
        self.on_complete = on_complete
        self.elapsed = 0.0
        self.done = False
        self._start = from_ if from_ is not None else self._read()

    def _read_ptr(self):
        """Walks a path like 'position.x' and returns (parent, last_attr)."""
        obj = self.source
        parts = self.attr.split(".")
        p = obj
        for i in range(len(parts) - 1):
            p = getattr(p, parts[i])
        return p, parts[-1]

    def _read(self):
        parent, attr = self._read_ptr()
        return getattr(parent, attr)

    def _write(self, value):
        parent, attr = self._read_ptr()
        current = getattr(parent, attr)
        # Keep the reference stable for Vector2 targets (update in place). Otherwise
        # setattr assigns a new Vector2 and chained tweens that captured the old
        # vector now point to a dead reference.
        if isinstance(current, Vector2) and isinstance(value, Vector2):
            current.x = value.x
            current.y = value.y
        else:
            setattr(parent, attr, value)

    def update(self, dt):
        if self.done:
            return
        self.elapsed += dt
        t = self.elapsed / self.duration
        if t >= 1.0:
            t = 1.0
            self.done = True
        eased = self.ease(t)
        self._write(_mix(self._start, self.end, eased))
        if self.done:
            if self.on_complete:
                self.on_complete()

    def kill(self):
        self.done = True


class TweenComponent(Component):
    """A tween driver attached to a GameObject.

    Multiple tweens can be added to the same object; they all progress independently.
    `.after(previous_tween)` can be used to run them sequentially (chain).
    """

    def __init__(self):
        super().__init__()
        self._tweens = []
        self._queue = []          # tweens waiting in the queue (start time not yet known)
        self._updating = False    # if to() is called during update (e.g. chain), wait safely
        self._pending = []        # tweens added during update, merged at the end of the loop

    def to(self, source, attr, end, duration=1.0, ease="linear",
           from_=None, on_complete=None, delay=0.0):
        """Adds a tween and returns it. If delay>0 it waits that many seconds."""
        tw = Tween(source, attr, end, duration, ease=ease,
                   from_=from_, on_complete=on_complete)
        if delay > 0:
            self._queue.append((delay, tw))
        elif self._updating:
            # Defer a tween added while the update loop is running (chain safety).
            self._pending.append(tw)
        else:
            self._tweens.append(tw)
        return tw

    def to_vec(self, source, attr, end_vec, duration=1.0, ease="linear",
               on_complete=None, delay=0.0):
        """Vector2-targeted tween (e.g. obj.position)."""
        if not isinstance(end_vec, Vector2):
            end_vec = Vector2(end_vec[0], end_vec[1])
        return self.to(source, attr, end_vec, duration, ease=ease,
                       on_complete=on_complete, delay=delay)

    def after(self, previous_tween):
        """Returns a 'sequential chain' reference that kicks in once the given tween finishes.

        Usage:
            t = tc.to(a, "position.x", 300, 1.0)
            tc.after(t).to(a, "position.y", 200, 0.5)
            tc.after(t).to(a, "position.z", 100, 0.3)   # both start once t finishes
        """
        return _Chain(self, previous_tween)

    def do_after(self, previous_tween, source, attr, end, duration=1.0,
                 ease="linear", on_complete=None):
        """The function-style form of `after`: a new tween starts once the previous one finishes."""
        return self.after(previous_tween).to(source, attr, end, duration,
                                             ease=ease, on_complete=on_complete)

    def update(self, dt):
        self._updating = True
        try:
            # Start the delayed tweens in the queue via the timer
            if self._queue:
                ready = []
                remaining = []
                for delay, tw in self._queue:
                    delay -= dt
                    if delay <= 0:
                        ready.append(tw)
                    else:
                        remaining.append((delay, tw))
                self._queue = remaining
                self._tweens.extend(ready)

            live = []
            for tw in self._tweens:
                tw.update(dt)
                if not tw.done:
                    live.append(tw)
            self._tweens = live
        finally:
            self._updating = False
        # Take over tweens added during update (e.g. chain on_complete)
        if self._pending:
            self._tweens.extend(self._pending)
            self._pending.clear()

    def clear(self):
        """Cancels all tweens (and the pending queue)."""
        self._tweens.clear()
        self._queue.clear()

    def running(self):
        """Number of running tweens."""
        return len(self._tweens)


class _Chain:
    """Result of `TweenComponent.after()`: starts the targets once the previous tween finishes.

    Multiple `.to(...)` calls can be made on the same chain; they all start once the
    previous tween finishes (in application order). It does not overwrite `on_complete`
    callbacks, it chains them.
    """

    def __init__(self, component, previous):
        self.component = component
        self.previous = previous
        self.actions = []  # (specs to start when _chain_start is called)

    def to(self, source, attr, end, duration=1.0, ease="linear",
           from_=None, on_complete=None):
        spec = (source, attr, end, duration, ease, from_, on_complete)
        self.actions.append(spec)
        if len(self.actions) == 1 and self.previous is not None:
            # Hook the first target: all actions start once the previous tween finishes.
            orig = self.previous.on_complete

            def _wrapped():
                if orig:
                    orig()
                self._fire()

            self.previous.on_complete = _wrapped
        elif self.previous is None and len(self.actions) == 1:
            # If there is no previous tween, start right away
            self._fire()
        return self

    def _fire(self):
        """Starts all registered targets."""
        for (source, attr, end, duration, ease, from_, on_complete) in self.actions:
            self.component.to(source, attr, end, duration, ease=ease,
                              from_=from_, on_complete=on_complete)


# backward-friendly name
Tweener = TweenComponent
