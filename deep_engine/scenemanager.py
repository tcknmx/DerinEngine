class SceneManager:
    """Named scene registry with simple transitions.

    Lets a game build ALL of its scenes up front, register them by name and
    switch between them without keeping references spread over the codebase:

        sm = SceneManager()
        sm.register("menu", main_menu_scene, set_scene=engine)
        sm.register("level1", level_scene)
        ...
        sm.switch_to("level1")          # or Engine instance passed at runtime

    The engine keeps one shared SceneManager (`Engine.scene_manager`); scenes
    can also push themselves as a stack (overlay screens like pause menus) via
    `push`/`pop` -- the top of the stack is automatically shown.
    """
    def __init__(self, engine=None):
        self.engine = engine          # set later via `attach(engine)` if unknown now
        self._scenes = {}
        self._stack = []              # ordered list of scene names (top = active)

    def attach(self, engine):
        self.engine = engine
        return self

    def register(self, name: str, scene, switch=False):
        """Registers a scene under `name`. If `switch` is True, immediately shows it."""
        self._scenes[name] = scene
        if switch:
            self.switch_to(name)
        return scene

    def scene(self, name: str):
        """Returns the registered scene (or None)."""
        return self._scenes.get(name)

    def has(self, name: str) -> bool:
        return name in self._scenes

    def names(self):
        return list(self._scenes.keys())

    # --- Flat switching -----------------------------------------------------
    def switch_to(self, name: str):
        """Makes the named scene the ACTIVE scene (clears the overlay stack)."""
        scene = self._scenes.get(name)
        if scene is None:
            raise KeyError(f"SceneManager: kayitli sahne yok: '{name}'")
        self._stack = [name]
        if self.engine:
            self.engine.set_scene(scene)
        return scene

    # --- Stack mode (overlay / pause screens) ------------------------------
    def push(self, name: str):
        """Overlays `name` on top of the current scene (stops the one below)."""
        scene = self._scenes.get(name)
        if scene is None:
            raise KeyError(f"SceneManager: kayitli sahne yok: '{name}'")
        if self.engine and self.engine.active_scene is not None:
            self.engine.active_scene.active = False
        self._stack.append(name)
        if self.engine:
            self.engine.set_scene(scene)

    def pop(self):
        """Closes the top overlay scene and returns to the one below."""
        if len(self._stack) <= 1:
            if self.engine and self._stack:
                self.engine.active_scene.active = True
            return None
        self._stack.pop()
        name = self._stack[-1]
        scene = self._scenes[name]
        scene.active = True
        if self.engine:
            self.engine.set_scene(scene)
        return scene

    @property
    def current_name(self):
        return self._stack[-1] if self._stack else None