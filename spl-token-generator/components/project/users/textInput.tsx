import { Input } from "@nextui-org/react";
import React from "react";

class TextInput extends React.Component {
  constructor(props) {
    super(props);
    this.textInput = React.createRef();
    this.focusTextInput = this.focusTextInput.bind(this);
  }

  focusTextInput() {
    this.textInput.current.focus();
  }

  render() {
    return (
      <div>
        <Input
          type="text"
          ref={this.textInput}
          onClick={this.focusTextInput}
          size="xs"
          aria-label="Default msg"
        />
      </div>
    );
  }
}
export default TextInput;
