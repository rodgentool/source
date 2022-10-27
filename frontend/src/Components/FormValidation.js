import { useState } from "react";

export const FormValidation = ({initialValues, validations, onSubmit}) => {
    const [data, setData] = useState((initialValues || {}));
    const [errors, setErrors] = useState({});
    
    const handleChange = (key, val) => {
        setData({...data, [key]: val});

        if (validations){
            let valid = true;
            const newErrors = {...errors};
            const value = val;
            const validation = validations[key];
            const custom = validation?.custom;
            if (custom?.isValid && !custom.isValid(value)) {
                valid = false;
                newErrors[key] = custom.message;
            }
            if (valid) {
                delete newErrors[key]
            }
            return setErrors(newErrors);
        }
    }
  
    const handleSubmit = (e) => {
      if (validations) {
        let valid = true;
        const newErrors = {};
        for (const key in validations){
            const value = data[key];
            const validation = validations[key];
            const custom = validation?.custom;
            if (custom?.isValid && !custom.isValid(value)) {
                valid = false;
                newErrors[key] = custom.message;
            }
        }
  
        if (!valid) {
            return setErrors(newErrors);

        }
      }
  
      setErrors({});
      if (onSubmit) {
        onSubmit();
      }
    }
  
    return {
      data,
      handleChange,
      handleSubmit,
      errors,
    }
  }