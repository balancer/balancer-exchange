export const validators = {
    requiredTokenValueValidators: ['required', 'isFloat', 'isPositive'],
    requiredTokenValueValidatorErrors: [
        'Field required',
        'Invalid number',
        'Value must be positive',
    ],
    optionalTokenValueValidators: ['isFloat', 'isPositive'],
    optionalTokenValueValidatorErrors: [
        'Invalid number',
        'Value must be positive',
    ],
};
