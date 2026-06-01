import {
  createSchemaIssue,
  createValidationResult
} from './schemaValidation.js';


export function validateJSONText(
  text,
  validateData
) {

  try {

    const data =
      JSON.parse(
        text
      );

    return {
      data,
      validation:
        validateData(
          data
        )
    };

  } catch (error) {

    return {
      data: null,
      validation:
        createValidationResult([
          createSchemaIssue(
            'error',
            'json.invalid',
            'JSON поврежден и не может быть прочитан.',
            {
              message: error.message
            }
          )
        ])
    };
  }
}
