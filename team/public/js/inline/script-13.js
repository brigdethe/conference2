
                    document.addEventListener('DOMContentLoaded', function() {
                        const radios = document.querySelectorAll('input[type="radio"]');

                        radios.forEach(radio => {
                            radio.addEventListener('change', function() {
                                // Get the group name of the changed radio
                                const groupName = radio.name;

                                // Get all radios in the same group
                                const groupRadios = document.querySelectorAll(`input[type="radio"][name="${groupName}"]`);

                                // Reset labels in this group only
                                groupRadios.forEach(r => {
                                    const label = r.closest('form') ? .querySelector(`label.radio-button-label.w-form-label[for="${r.id}"]`) ||
                                        r.parentElement.querySelector('.radio-button-label.w-form-label');
                                    if (label) {
                                        label.style.color = ''; // reset to default
                                    }
                                });

                                // Highlight selected one
                                if (radio.checked) {
                                    const selectedLabel = radio.closest('form') ? .querySelector(`label.radio-button-label.w-form-label[for="${radio.id}"]`) ||
                                        radio.parentElement.querySelector('.radio-button-label.w-form-label');
                                    if (selectedLabel) {
                                        selectedLabel.style.color = 'white';
                                    }
                                }
                            });
                        });
                    });
                