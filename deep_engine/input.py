import pygame

class Input:
    """Input Manager for easily querying user input (keyboard, mouse & gamepad)"""
    _keys_pressed = set()
    _keys_down = set()
    _keys_up = set()
    _mouse_pos = (0, 0)
    _mouse_buttons = [False, False, False]
    _mouse_down = [False, False, False]
    _typed_chars = []      # printable chars typed this frame (for text input)

    # --- Gamepad / Joystick ---
    _joystick = None          # first gamepad found
    _axis_values = [0.0] * 8  # analog axis values (-1..1), at most 8 axes
    _hat_values = [(0, 0)] * 4
    _joy_buttons_held = set() # gamepad buttons held down
    _joy_buttons_down = set() # gamepad buttons pressed this frame
    _joy_buttons_up = set()   # gamepad buttons released this frame
    _axes_deadzone = 0.2      # analog stick dead zone (prevents drift/jitter)

    # Aliases for common keys (for easy use)
    KEY_MAP = {
        "A": pygame.K_a, "B": pygame.K_b, "C": pygame.K_c, "D": pygame.K_d,
        "E": pygame.K_e, "F": pygame.K_f, "G": pygame.K_g, "H": pygame.K_h,
        "I": pygame.K_i, "J": pygame.K_j, "K": pygame.K_k, "L": pygame.K_l,
        "M": pygame.K_m, "N": pygame.K_n, "O": pygame.K_o, "P": pygame.K_p,
        "Q": pygame.K_q, "R": pygame.K_r, "S": pygame.K_s, "T": pygame.K_t,
        "U": pygame.K_u, "V": pygame.K_v, "W": pygame.K_w, "X": pygame.K_x,
        "Y": pygame.K_y, "Z": pygame.K_z,
        "SPACE": pygame.K_SPACE, "ENTER": pygame.K_RETURN, "ESCAPE": pygame.K_ESCAPE,
        "LEFT": pygame.K_LEFT, "RIGHT": pygame.K_RIGHT, "UP": pygame.K_UP, "DOWN": pygame.K_DOWN,
        "LSHIFT": pygame.K_LSHIFT, "RSHIFT": pygame.K_RSHIFT, "TAB": pygame.K_TAB,
        "BACKSPACE": pygame.K_BACKSPACE, "KPENTER": pygame.K_KP_ENTER,
        "BACKQUOTE": pygame.K_BACKQUOTE, "QUOTEDBL": pygame.K_QUOTEDBL,
        "F1": pygame.K_F1, "F2": pygame.K_F2, "F3": pygame.K_F3, "F4": pygame.K_F4, "F5": pygame.K_F5,
        "0": pygame.K_0, "1": pygame.K_1, "2": pygame.K_2, "3": pygame.K_3, "4": pygame.K_4,
        "5": pygame.K_5, "6": pygame.K_6, "7": pygame.K_7, "8": pygame.K_8, "9": pygame.K_9
    }

    # Logical action -> gamepad button number (Xbox/console layout)
    # 0=A,1=B,2=X,3=Y,4=LB,5=RB,6=Back,7=Start,8=LS,9=RS
    BUTTON_MAP = {
        "SPACE": 0, "ENTER": 0,      # A button = jump / confirm
        "F": 2,                      # X button = shoot
        "LSHIFT": 4,                 # LB = dash
        "ESCAPE": 7,                 # Start = quit
    }

    @classmethod
    def _init_joystick(cls):
        """Grabs the first gamepad if one exists. Attempts this safely."""
        try:
            pygame.joystick.init()
            if pygame.joystick.get_count() > 0:
                cls._joystick = pygame.joystick.Joystick(0)
                cls._joystick.init()
        except Exception as e:
            cls._joystick = None
            print(f"[DerinEngine] Kumanda bulunamadi/devre disi: {e}")

    @classmethod
    def _poll_joystick(cls):
        """Updates the gamepad state at the start of each frame."""
        if cls._joystick is None:
            # Detect it when the stick is plugged in
            try:
                pygame.joystick.get_init()
                if pygame.joystick.get_count() > 0 and cls._joystick is None:
                    cls._joystick = pygame.joystick.Joystick(0)
                    cls._joystick.init()
            except Exception:
                return
        if cls._joystick is None:
            return

        js = cls._joystick
        ax_count = min(js.get_numaxes(), len(cls._axis_values))
        for i in range(ax_count):
            val = js.get_axis(i)
            if abs(val) < cls._axes_deadzone:
                val = 0.0
            cls._axis_values[i] = val

        hat_count = min(js.get_numhats(), len(cls._hat_values))
        for i in range(hat_count):
            cls._hat_values[i] = js.get_hat(i)

        n = js.get_numbuttons()
        held = {i for i in range(n) if js.get_button(i)}
        cls._joy_buttons_down = held - cls._joy_buttons_held
        cls._joy_buttons_up = cls._joy_buttons_held - held
        cls._joy_buttons_held = held

    @classmethod
    def _update_events(cls, events):
        """Called at the start of each frame; updates the events."""
        cls._keys_down.clear()
        cls._keys_up.clear()
        cls._mouse_down = [False, False, False]
        cls._mouse_pos = pygame.mouse.get_pos()
        cls._typed_chars = []

        for event in events:
            if event.type == pygame.KEYDOWN:
                cls._keys_pressed.add(event.key)
                cls._keys_down.add(event.key)
                # Collect printable text (letters, digits, spaces, punctuation)
                if event.unicode:
                    cls._typed_chars.append(event.unicode)
            elif event.type == pygame.KEYUP:
                cls._keys_pressed.discard(event.key)
                cls._keys_up.add(event.key)
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if 1 <= event.button <= 3:
                    cls._mouse_down[event.button - 1] = True
                    cls._mouse_buttons[event.button - 1] = True
            elif event.type == pygame.MOUSEBUTTONUP:
                if 1 <= event.button <= 3:
                    cls._mouse_buttons[event.button - 1] = False
            elif event.type == pygame.JOYDEVICEREMOVED:
                cls._joystick = None
            elif event.type == pygame.JOYDEVICEADDED:
                cls._init_joystick()

        cls._poll_joystick()

    @classmethod
    def get_key(cls, key_name: str) -> bool:
        """Is the key being held down right now? (keyboard + gamepad combined)"""
        code = cls.KEY_MAP.get(key_name.upper())
        if code is not None and code in cls._keys_pressed:
            return True
        btn = cls.BUTTON_MAP.get(key_name.upper())
        return btn is not None and btn in cls._joy_buttons_held

    @classmethod
    def get_key_down(cls, key_name: str) -> bool:
        """Was the key pressed exactly this frame? (one-shot trigger, keyboard + gamepad)"""
        code = cls.KEY_MAP.get(key_name.upper())
        if code is not None and code in cls._keys_down:
            return True
        btn = cls.BUTTON_MAP.get(key_name.upper())
        return btn is not None and btn in cls._joy_buttons_down

    @classmethod
    def get_key_up(cls, key_name: str) -> bool:
        """Was the key released this frame?"""
        code = cls.KEY_MAP.get(key_name.upper())
        if code is not None and code in cls._keys_up:
            return True
        btn = cls.BUTTON_MAP.get(key_name.upper())
        return btn is not None and btn in cls._joy_buttons_up

    @classmethod
    def get_typed_text(cls) -> str:
        """Returns the text typed since the last frame (letters/digits/space/punct).

        Used by text-input UIs (e.g. the in-game console). This buffer is
        cleared automatically at the start of the next frame.
        """
        return "".join(cls._typed_chars)

    # --- Analog axis helpers ---
    @classmethod
    def get_axis(cls, index: int) -> float:
        """Analog axis value (-1..1). 0=left-right, 1=down-up."""
        if index < len(cls._axis_values):
            return cls._axis_values[index]
        return 0.0

    @classmethod
    def get_hat(cls, index=0):
        """D-Pad arrow value: (dx, dy), each -1, 0 or 1."""
        if index < len(cls._hat_values):
            return cls._hat_values[index]
        return (0, 0)

    @classmethod
    def get_horizontal_axis(cls) -> float:
        """Combined horizontal input from keyboard (A/D) + gamepad (left stick + D-Pad) (-1..1)."""
        v = cls.get_axis(0)
        hx, _ = cls.get_hat(0)
        if v == 0 and hx != 0:
            v = float(hx)
        if Input.get_key("A") or Input.get_key("LEFT") or Input.get_key("D") or Input.get_key("RIGHT"):
            k = 0.0
            k -= 1.0 if (Input.get_key("A") or Input.get_key("LEFT")) else 0.0
            k += 1.0 if (Input.get_key("D") or Input.get_key("RIGHT")) else 0.0
            v = k if k != 0 else v
        return v

    @classmethod
    def is_controller_active(cls) -> bool:
        """Is a gamepad connected?"""
        return cls._joystick is not None

    @classmethod
    def get_mouse_position(cls):
        """Returns the mouse's (x, y) position on screen."""
        return cls._mouse_pos

    @classmethod
    def get_mouse_button_down(cls, button=0):
        """Was the Left (0), Middle (1) or Right (2) button pressed?"""
        if 0 <= button < 3:
            return cls._mouse_down[button]
        return False
