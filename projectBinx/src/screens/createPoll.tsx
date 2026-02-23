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
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import PollService from '../services/pollService';
import SessionService from '../services/sessionService';
import {MainTabParamList} from '../types/navigation';
import {PollData, PollType} from '../types/pollTypes';
import globalStyles from '../styles/globalStyles';
import pollStyles from '../styles/pollStyles';
import theme from '../styles/theme';

interface Props {
  navigation: BottomTabNavigationProp<MainTabParamList, 'CreatePoll'>;
}

const MAX_OPTIONS = 10;
const FIXED_SLIDER_OPTIONS = 5;

const pollTypeOptions: PollType[] = ['simple', 'slider', 'multi'];
const simplePollPresets = ['yes-no', 'up-down'] as const;
type SimplePollPreset = (typeof simplePollPresets)[number];

const defaultOptionsByType: Record<PollType, string[]> = {
  simple: ['Yes', 'No'],
  slider: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
  multi: ['', ''],
};

const pollTypeHelperText: Record<PollType, string> = {
  simple: 'Single-choice poll. People can select one option.',
  slider: 'Rating-style poll with 5 ordered options.',
  multi: 'Multiple-choice poll. People can select more than one option.',
};

const CreatePoll: React.FC<Props> = ({navigation}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pollType, setPollType] = useState<PollType>('simple');
  const [allowComments, setAllowComments] = useState(true);
  const [simplePreset, setSimplePreset] = useState<SimplePollPreset>('yes-no');
  const [optionsByType, setOptionsByType] = useState<Record<PollType, string[]>>(
    defaultOptionsByType,
  );
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const options = optionsByType[pollType];
  const minOptions = pollType === 'slider' ? FIXED_SLIDER_OPTIONS : 2;
  const maxOptions = pollType === 'slider' ? FIXED_SLIDER_OPTIONS : MAX_OPTIONS;
  const canEditOptions = pollType === 'multi';
  const isSliderPoll = pollType === 'slider';
  const isSimplePoll = pollType === 'simple';

  const selectedSliderIndex = 2;
  const sliderThumbLeftPercent =
    (selectedSliderIndex / (FIXED_SLIDER_OPTIONS - 1)) * 100;

  const getOptionPlaceholder = (index: number) => {
    if (isSliderPoll) {
      return `Level ${index + 1}`;
    }

    if (pollType === 'multi') {
      return `Choice ${index + 1}`;
    }

    return `Option ${index + 1}`;
  };

  const previewTitle = title.trim() || 'Untitled Poll';
  const previewDescription = description.trim();
  const previewOptions = options.map((option, index) => {
    const trimmedOption = option.trim();
    return trimmedOption || getOptionPlaceholder(index);
  });

  const updateOption = (index: number, text: string) => {
    setHasInteracted(true);
    setOptionsByType(previous => {
      const nextOptions = [...previous[pollType]];
      nextOptions[index] = text;
      return {
        ...previous,
        [pollType]: nextOptions,
      };
    });
  };

  const addOption = () => {
    if (options.length >= maxOptions || !canEditOptions) {
      return;
    }

    setHasInteracted(true);
    setOptionsByType(previous => ({
      ...previous,
      [pollType]: [...previous[pollType], ''],
    }));
  };

  const removeOption = (index: number) => {
    if (options.length <= minOptions || !canEditOptions) {
      return;
    }

    setHasInteracted(true);
    setOptionsByType(previous => {
      const nextOptions = previous[pollType].filter(
        (_, optionIndex) => optionIndex !== index,
      );
      return {
        ...previous,
        [pollType]: nextOptions,
      };
    });
  };

  const handlePollTypeSelect = (selectedType: PollType) => {
    setHasInteracted(true);
    setPollType(selectedType);

    if (selectedType === 'simple') {
      setSimplePreset('yes-no');
      setOptionsByType(previous => ({
        ...previous,
        simple: ['Yes', 'No'],
      }));
    }

    setErrorMessage(null);
  };

  const handleSimplePresetSelect = (preset: SimplePollPreset) => {
    setHasInteracted(true);
    setSimplePreset(preset);
    setOptionsByType(previous => ({
      ...previous,
      simple: preset === 'yes-no' ? ['Yes', 'No'] : ['Up', 'Down'],
    }));
    setErrorMessage(null);
  };

  const renderPostPreview = () => {
    if (isSliderPoll) {
      return (
        <View style={pollStyles.card}>
          <Text style={pollStyles.title}>{previewTitle}</Text>
          <Text style={pollStyles.description}>
            {previewDescription || 'Question preview will appear here.'}
          </Text>

          <View style={styles.sliderPreviewContainer}>
            <View style={styles.sliderTrack}>
              <View
                style={[
                  styles.sliderThumb,
                  {left: `${sliderThumbLeftPercent}%`},
                ]}
              />
            </View>
            <View style={styles.sliderLabelsRow}>
              <Text style={styles.sliderLabelText}>{previewOptions[0]}</Text>
              <Text style={styles.sliderLabelText}>
                {previewOptions[previewOptions.length - 1]}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    if (isSimplePoll) {
      return (
        <View style={pollStyles.card}>
          <Text style={pollStyles.title}>{previewTitle}</Text>
          {previewDescription ? (
            <Text style={pollStyles.description}>{previewDescription}</Text>
          ) : null}

          <View style={styles.simplePreviewRow}>
            {previewOptions.slice(0, 2).map(option => (
              <View key={option} style={styles.simplePreviewButton}>
                <Text style={styles.simplePreviewButtonText}>{option}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    return (
      <View style={pollStyles.card}>
        <Text style={pollStyles.title}>{previewTitle}</Text>
        {previewDescription ? (
          <Text style={pollStyles.description}>{previewDescription}</Text>
        ) : null}

        <View>
          {previewOptions.map((option, index) => (
            <View key={`${option}-${index}`} style={pollStyles.optionButtonBase}>
              <View style={[pollStyles.radioOuter, pollStyles.radioOuterUnselected]}>
                <View style={styles.multiPreviewRadioInner} />
              </View>
              <Text style={pollStyles.optionText}>{option}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const handleCreatePoll = async () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const cleanedOptions = options.map(option => option.trim()).filter(Boolean);

    if (!trimmedTitle) {
      setErrorMessage('Poll title is required.');
      return;
    }

    if (isSliderPoll && !trimmedDescription) {
      setErrorMessage('A slider poll requires one question.');
      return;
    }

    if (cleanedOptions.length < minOptions) {
      setErrorMessage(`Please provide at least ${minOptions} options.`);
      return;
    }

    if (cleanedOptions.length > maxOptions) {
      setErrorMessage(`A ${pollType} poll can have up to ${maxOptions} options.`);
      return;
    }

    if (pollType === 'slider' && cleanedOptions.length !== FIXED_SLIDER_OPTIONS) {
      setErrorMessage(
        `A slider poll must have exactly ${FIXED_SLIDER_OPTIONS} options.`,
      );
      return;
    }

    const uniqueOptions = new Set(
      cleanedOptions.map(option => option.toLowerCase()),
    );
    if (uniqueOptions.size !== cleanedOptions.length) {
      setErrorMessage('Options must be unique.');
      return;
    }

    const sessionUser = SessionService.getCurrentUser();

    const newPoll: PollData = {
      user: sessionUser?.username ?? 'current_user',
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
      const createdPoll = await PollService.postPoll(newPoll);
      Alert.alert('Success', `${pollType} poll created.`);
      navigation.navigate('Home', {createdPoll});
    } catch (error) {
      setErrorMessage('Unable to create poll right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.formScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.container,
          hasInteracted ? styles.containerWithStickyPreview : null,
        ]}>
      <Text style={[globalStyles.title, styles.title]}>Create Poll</Text>

      <Text style={globalStyles.sectionTitle}>Poll Type</Text>
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
              onPress={() => handlePollTypeSelect(type)}>
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

      <Text style={styles.pollTypeHelpText}>{pollTypeHelperText[pollType]}</Text>

      <TextInput
        style={globalStyles.input}
        placeholder="Poll title"
        value={title}
        onChangeText={text => {
          setHasInteracted(true);
          setTitle(text);
          if (errorMessage) {
            setErrorMessage(null);
          }
        }}
      />

      {isSliderPoll ? (
        <TextInput
          style={globalStyles.input}
          placeholder="Question"
          value={description}
          onChangeText={text => {
            setHasInteracted(true);
            setDescription(text);
          }}
        />
      ) : (
        <TextInput
          style={[globalStyles.input, styles.descriptionInput]}
          placeholder="Description (optional)"
          value={description}
          onChangeText={text => {
            setHasInteracted(true);
            setDescription(text);
          }}
          multiline={true}
        />
      )}

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Allow comments</Text>
        <Switch
          value={allowComments}
          onValueChange={value => {
            setHasInteracted(true);
            setAllowComments(value);
          }}
        />
      </View>

      {isSimplePoll ? (
        <>
          <Text style={globalStyles.sectionTitle}>Simple Poll Options</Text>
          <View style={styles.simplePresetRow}>
            <TouchableOpacity
              style={[
                styles.simplePresetButton,
                simplePreset === 'yes-no'
                  ? styles.pollTypeButtonSelected
                  : styles.pollTypeButtonUnselected,
              ]}
              onPress={() => handleSimplePresetSelect('yes-no')}>
              <Text
                style={
                  simplePreset === 'yes-no'
                    ? styles.pollTypeButtonTextSelected
                    : styles.pollTypeButtonTextUnselected
                }>
                YES / NO
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.simplePresetButton,
                simplePreset === 'up-down'
                  ? styles.pollTypeButtonSelected
                  : styles.pollTypeButtonUnselected,
              ]}
              onPress={() => handleSimplePresetSelect('up-down')}>
              <Text
                style={
                  simplePreset === 'up-down'
                    ? styles.pollTypeButtonTextSelected
                    : styles.pollTypeButtonTextUnselected
                }>
                UP / DOWN
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      {pollType === 'multi' ? (
        <>
          <Text style={globalStyles.sectionTitle}>
            Options ({options.length}/{maxOptions})
          </Text>
          {options.map((option, index) => (
            <View key={index} style={styles.optionRow}>
              <TextInput
                style={styles.optionInput}
                placeholder={getOptionPlaceholder(index)}
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
                  options.length <= minOptions ? styles.removeButtonDisabled : null,
                ]}
                disabled={options.length <= minOptions}
                onPress={() => removeOption(index)}>
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={[
              styles.addButton,
              options.length >= maxOptions ? styles.addButtonDisabled : null,
            ]}
            disabled={options.length >= maxOptions}
            onPress={addOption}>
            <Text style={styles.addButtonText}>Add Option</Text>
          </TouchableOpacity>
        </>
      ) : null}

      {errorMessage ? <Text style={globalStyles.errorText}>{errorMessage}</Text> : null}

      <Button
        title={isSubmitting ? 'Creating Poll...' : 'Create Poll'}
        disabled={isSubmitting}
        onPress={handleCreatePoll}
      />
      </ScrollView>

      {hasInteracted ? (
        <View style={styles.stickyPreviewContainer} pointerEvents="box-none">
          <View style={styles.stickyPreviewCard} pointerEvents="auto">
            <Text style={globalStyles.sectionTitle}>Post Preview</Text>
            <ScrollView
              style={styles.stickyPreviewBody}
              contentContainerStyle={styles.stickyPreviewBodyContent}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {renderPostPreview()}
            </ScrollView>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  formScroll: {
    flex: 1,
  },
  container: {
    padding: theme.spacing.xl,
    paddingBottom: 30,
  },
  containerWithStickyPreview: {
    paddingBottom: 360,
  },
  title: {
    fontWeight: '700',
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
    fontSize: theme.fontSize.base,
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
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryTint,
  },
  pollTypeButtonUnselected: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pollTypeButtonText: {
    fontWeight: '600',
  },
  pollTypeButtonTextSelected: {
    color: theme.colors.primary,
  },
  pollTypeButtonTextUnselected: {
    color: theme.colors.textPrimary,
  },
  pollTypeHelpText: {
    color: theme.colors.textSecondary,
    marginBottom: 12,
    fontSize: theme.fontSize.md,
  },
  simplePresetRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  simplePresetButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  sliderPreviewContainer: {
    marginBottom: 16,
  },
  stickyPreviewContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  stickyPreviewCard: {
    width: '100%',
  },
  stickyPreviewBody: {
    maxHeight: 220,
  },
  stickyPreviewBodyContent: {
    paddingBottom: 4,
  },
  sliderTrack: {
    height: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.border,
    position: 'relative',
    marginTop: 4,
    marginBottom: 8,
  },
  sliderThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.primary,
    position: 'absolute',
    top: -6,
    marginLeft: -9,
  },
  sliderLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabelText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  simplePreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  simplePreviewButton: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  simplePreviewButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  multiPreviewRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
  },
  removeButton: {
    backgroundColor: theme.colors.dangerStrong,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 6,
  },
  removeButtonDisabled: {
    opacity: 0.5,
  },
  removeButtonText: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: theme.colors.primary,
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
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
});

export default CreatePoll;
