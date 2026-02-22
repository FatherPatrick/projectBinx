import React, {useState} from 'react';
import {
  Alert,
  Button,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {StackNavigationProp} from '@react-navigation/stack';
import PollService from '../services/pollService';
import {RootStackParamList} from '../types/navigation';
import {PollData, PollType} from '../types/pollTypes';

interface Props {
  navigation: StackNavigationProp<RootStackParamList, 'CreatePoll'>;
}

const MAX_OPTIONS = 10;

const pollTypeOptions: PollType[] = ['simple', 'slider', 'multi'];

const CreatePoll: React.FC<Props> = ({navigation}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pollType, setPollType] = useState<PollType>('simple');
  const [allowComments, setAllowComments] = useState(true);
  const [options, setOptions] = useState(['', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateOption = (index: number, text: string) => {
    const nextOptions = [...options];
    nextOptions[index] = text;
    setOptions(nextOptions);
  };

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) {
      return;
    }

    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) {
      return;
    }

    const nextOptions = options.filter(
      (_, optionIndex) => optionIndex !== index,
    );
    setOptions(nextOptions);
  };

  const handleCreatePoll = async () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const cleanedOptions = options.map(option => option.trim()).filter(Boolean);

    if (!trimmedTitle) {
      setErrorMessage('Poll title is required.');
      return;
    }

    if (cleanedOptions.length < 2) {
      setErrorMessage('Please provide at least 2 options.');
      return;
    }

    if (cleanedOptions.length > MAX_OPTIONS) {
      setErrorMessage('A poll can have up to 10 options.');
      return;
    }

    const uniqueOptions = new Set(
      cleanedOptions.map(option => option.toLowerCase()),
    );
    if (uniqueOptions.size !== cleanedOptions.length) {
      setErrorMessage('Options must be unique.');
      return;
    }

    const newPoll: PollData = {
      user: 'current_user',
      title: trimmedTitle,
      description: trimmedDescription || undefined,
      type: pollType,
      allowComments,
      options: cleanedOptions.map((optionText, index) => ({
        optionTypeId: index + 1,
        optionText,
      })),
    };

    try {
      setErrorMessage(null);
      setIsSubmitting(true);
      await PollService.postPoll(newPoll);
      Alert.alert('Success', `${pollType} poll created.`);
      navigation.navigate('Home', {createdPoll: newPoll});
    } catch (error) {
      setErrorMessage('Unable to create poll right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Poll</Text>

      <Text style={styles.sectionTitle}>Poll Type</Text>
      <View style={styles.pollTypeRow}>
        {pollTypeOptions.map(type => {
          const isSelected = pollType === type;
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.pollTypeButton,
                isSelected
                  ? styles.pollTypeButtonSelected
                  : styles.pollTypeButtonUnselected,
              ]}
              onPress={() => setPollType(type)}>
              <Text
                style={[
                  styles.pollTypeButtonText,
                  isSelected
                    ? styles.pollTypeButtonTextSelected
                    : styles.pollTypeButtonTextUnselected,
                ]}>
                {type.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Poll title"
        value={title}
        onChangeText={text => {
          setTitle(text);
          if (errorMessage) {
            setErrorMessage(null);
          }
        }}
      />

      <TextInput
        style={[styles.input, styles.descriptionInput]}
        placeholder="Description (optional)"
        value={description}
        onChangeText={setDescription}
        multiline={true}
      />

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Allow comments</Text>
        <Switch value={allowComments} onValueChange={setAllowComments} />
      </View>

      <Text style={styles.sectionTitle}>
        Options ({options.length}/{MAX_OPTIONS})
      </Text>
      {options.map((option, index) => (
        <View key={index} style={styles.optionRow}>
          <TextInput
            style={styles.optionInput}
            placeholder={`Option ${index + 1}`}
            value={option}
            onChangeText={text => {
              updateOption(index, text);
              if (errorMessage) {
                setErrorMessage(null);
              }
            }}
          />
          <TouchableOpacity
            style={[
              styles.removeButton,
              options.length <= 2 ? styles.removeButtonDisabled : null,
            ]}
            disabled={options.length <= 2}
            onPress={() => removeOption(index)}>
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        style={[
          styles.addButton,
          options.length >= MAX_OPTIONS ? styles.addButtonDisabled : null,
        ]}
        disabled={options.length >= MAX_OPTIONS}
        onPress={addOption}>
        <Text style={styles.addButtonText}>Add Option</Text>
      </TouchableOpacity>

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      <Button
        title={isSubmitting ? 'Creating Poll...' : 'Create Poll'}
        disabled={isSubmitting}
        onPress={handleCreatePoll}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  pollTypeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  pollTypeButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  pollTypeButtonSelected: {
    borderColor: '#007bff',
    backgroundColor: '#e3f2fd',
  },
  pollTypeButtonUnselected: {
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  pollTypeButtonText: {
    fontWeight: '600',
  },
  pollTypeButtonTextSelected: {
    color: '#007bff',
  },
  pollTypeButtonTextUnselected: {
    color: '#333',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  removeButton: {
    backgroundColor: '#d9534f',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 6,
  },
  removeButtonDisabled: {
    opacity: 0.5,
  },
  removeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 6,
    marginBottom: 16,
    marginTop: 4,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorText: {
    color: '#b00020',
    marginBottom: 12,
  },
});

export default CreatePoll;
