import * as React from "react";
import { Input } from "./input"; // Your existing Input component
import { Label } from "./label";

interface TextInputProps extends Omit<React.ComponentProps<"input">, "value"> {
    label: string;
    maxLength: number;
    value?: string; // Force string type
}

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
    ({ label, maxLength, className, value: propValue, onChange, required, ...props }, ref) => {
        const [value, setValue] = React.useState<string>(propValue || "");

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const inputValue = e.target.value; // always string for text input
            if (inputValue.length <= maxLength) {
                setValue(inputValue);
                onChange?.(e);
            }
        };

        return (
            <div className="flex-1 space-y-2">
                <div className="flex justify-between text-xs">
                    <Label htmlFor={props.id}>
                        {label}
                        {required && <span className="text-destructive">*</span>}
                    </Label>

                    {value.length == maxLength && (
                        <span className="text-destructive">
                            {value.length}/{maxLength}
                        </span>
                    )}
                </div>
                {/* <Label htmlFor={props.id}>
                    {label}
                    {required && <span className="text-destructive">*</span>}
                </Label> */}

                <Input
                    {...props}
                    ref={ref}
                    value={value}
                    onChange={handleChange}
                    maxLength={maxLength}
                />

                {/* <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Max {maxLength} characters</span>

                    <span className="text-muted-foreground">
                        {value.length}/{maxLength}
                    </span>
                </div> */}
            </div>
        );
    }
);

TextInput.displayName = "TextInput";

export { TextInput };
