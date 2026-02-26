import {useState} from 'react';
import {StackNavigationProp} from '@react-navigation/stack';
import LoginService from '../../../services/loginService';
import SessionService from '../../../services/sessionService';
import {RootStackParamList} from '../../../types/navigation';

interface UseProfileAccountActionsParams {
  navigation: StackNavigationProp<RootStackParamList>;
  setErrorMessage: (message: string | null) => void;
}

const useProfileAccountActions = ({
  navigation,
  setErrorMessage,
}: UseProfileAccountActionsParams) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isLogoutPromptVisible, setIsLogoutPromptVisible] = useState(false);
  const [isDeletePromptVisible, setIsDeletePromptVisible] = useState(false);
  const [isDeletePhraseModalVisible, setIsDeletePhraseModalVisible] =
    useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deletePhraseError, setDeletePhraseError] = useState<string | null>(
    null,
  );

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);
      await SessionService.clearCurrentUser();
      navigation.reset({
        index: 0,
        routes: [{name: 'Login'}],
      });
    } catch (error) {
      setErrorMessage('Unable to logout right now.');
      setIsLoggingOut(false);
    }
  };

  const openDeletePrompt = () => {
    setDeletePhrase('');
    setDeletePhraseError(null);
    setIsDeletePromptVisible(true);
  };

  const closeDeletePrompt = () => {
    if (!isDeletingAccount) {
      setIsDeletePromptVisible(false);
    }
  };

  const proceedToDeletePhraseStep = () => {
    setIsDeletePromptVisible(false);
    setDeletePhrase('');
    setDeletePhraseError(null);
    setIsDeletePhraseModalVisible(true);
  };

  const closeDeletePhraseModal = () => {
    if (isDeletingAccount) {
      return;
    }

    setIsDeletePhraseModalVisible(false);
    setDeletePhrase('');
    setDeletePhraseError(null);
  };

  const handleDeletePhraseChange = (value: string) => {
    setDeletePhrase(value);
    if (deletePhraseError) {
      setDeletePhraseError(null);
    }
  };

  const handleDeleteAccount = async () => {
    const normalizedPhrase = deletePhrase.trim().toLowerCase();

    if (normalizedPhrase !== 'deletemyaccount') {
      setDeletePhraseError('Type DeleteMyAccount to confirm account deletion.');
      return;
    }

    try {
      setIsDeletingAccount(true);
      setDeletePhraseError(null);

      const currentUser = SessionService.getCurrentUser();

      await LoginService.deleteAccount({
        userId: currentUser?.id,
        phoneNumber: currentUser?.phoneNumber,
        email: currentUser?.email,
        confirmationPhrase: deletePhrase,
      });

      await SessionService.clearCurrentUser();
      setIsDeletePhraseModalVisible(false);
      navigation.reset({
        index: 0,
        routes: [{name: 'CreateAccount'}],
      });
    } catch (error) {
      setDeletePhraseError('Unable to delete account right now.');
      setIsDeletingAccount(false);
    }
  };

  const openLogoutPrompt = () => {
    setIsLogoutPromptVisible(true);
  };

  const closeLogoutPrompt = () => {
    if (!isLoggingOut) {
      setIsLogoutPromptVisible(false);
    }
  };

  return {
    isLoggingOut,
    isDeletingAccount,
    isLogoutPromptVisible,
    isDeletePromptVisible,
    isDeletePhraseModalVisible,
    deletePhrase,
    deletePhraseError,
    handleLogout,
    openDeletePrompt,
    closeDeletePrompt,
    proceedToDeletePhraseStep,
    closeDeletePhraseModal,
    handleDeletePhraseChange,
    handleDeleteAccount,
    openLogoutPrompt,
    closeLogoutPrompt,
  };
};

export default useProfileAccountActions;
