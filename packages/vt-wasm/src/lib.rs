use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct VtParser {
    parser: vt100::Parser,
}

#[wasm_bindgen]
impl VtParser {
    #[wasm_bindgen(constructor)]
    pub fn new(rows: u16, cols: u16) -> Self {
        Self {
            parser: vt100::Parser::new(rows, cols, 0),
        }
    }

    pub fn process(&mut self, data: &[u8]) {
        self.parser.process(data);
    }

    pub fn resize(&mut self, rows: u16, cols: u16) {
        self.parser.screen_mut().set_size(rows, cols);
    }

    /// Returns ANSI escape sequences that fully reconstruct the current screen.
    pub fn state_formatted(&self) -> Vec<u8> {
        self.parser.screen().state_formatted()
    }

    pub fn alternate_screen(&self) -> bool {
        self.parser.screen().alternate_screen()
    }
}
