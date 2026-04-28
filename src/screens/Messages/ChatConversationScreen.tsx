import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import TopBar from '../../components/TopBar';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { ensureConversationWithUser, sendChatMessage, subscribeConversationMessages, type ConversationMessageItem } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';

function formatMessageTime(value: ConversationMessageItem['createdAt']): string {
  const ms = typeof (value as any)?.toMillis === 'function'
    ? (value as any).toMillis()
    : typeof (value as any)?.seconds === 'number'
      ? (value as any).seconds * 1000
      : 0;

  if (!ms) {
    return 'Bây giờ';
  }

  const date = new Date(ms);
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

export default function ChatConversationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const route = useRoute();
  const params = (route.params as RootStackParamList['ChatConversation']) ?? {
    userId: '',
    name: 'Người dùng',
    avatar: undefined,
    conversationId: undefined,
  };

  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ConversationMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [conversationId, setConversationId] = useState(params.conversationId ?? '');

  const avatarSource = useMemo(() => {
    if (!params.avatar) {
      return { uri: 'https://i.pravatar.cc/150?img=47' };
    }
    return { uri: params.avatar };
  }, [params.avatar]);

  React.useEffect(() => {
    let unsubMessages: (() => void) | undefined;
    let mounted = true;

    (async () => {
      try {
        const ensured = await ensureConversationWithUser(params.userId);
        if (!mounted) {
          return;
        }

        const targetConversationId = params.conversationId || ensured.conversationId;
        setConversationId(targetConversationId);
        setError('');

        unsubMessages = subscribeConversationMessages(
          targetConversationId,
          (items) => {
            if (!mounted) {
              return;
            }
            setMessages(items);
            setLoading(false);
          },
          (e) => {
            if (!mounted) {
              return;
            }
            setError(e instanceof Error ? e.message : 'Không thể tải hội thoại');
            setLoading(false);
          },
        );
      } catch (e) {
        if (!mounted) {
          return;
        }
        setError(e instanceof Error ? e.message : 'Không thể mở hội thoại');
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      if (unsubMessages) {
        unsubMessages();
      }
    };
  }, [params.conversationId, params.userId]);

  const onSend = async () => {
    const text = draft.trim();
    if (!text || sending || !conversationId) {
      return;
    }

    setSending(true);
    try {
      await sendChatMessage({
        conversationId,
        receiverId: params.userId,
        text,
      });
      setDraft('');
    } catch (e) {
      Alert.alert('Lỗi', e instanceof Error ? e.message : 'Không thể gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Tin nhắn" leftIcon="arrow-back" onPressLeft={() => navigation.goBack()} showRight={false} />

      <View style={styles.userHeader}>
        <Image source={avatarSource} style={styles.avatar} />
        <View style={styles.userHeaderText}>
          <Text style={styles.userName}>{params.name}</Text>
          <Text style={styles.userSub}>Đang hoạt động</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator color="#FFD14A" />
          <Text style={styles.stateText}>Đang tải hội thoại...</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.stateWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => (
          <View style={[styles.messageRow, item.senderId === user?.user_id ? styles.mineRow : styles.theirRow]}>
            <View style={[styles.messageBubble, item.senderId === user?.user_id ? styles.mineBubble : styles.theirBubble]}>
              <Text style={styles.messageText}>{item.text}</Text>
            </View>
            <Text style={styles.timeText}>{formatMessageTime(item.createdAt)}</Text>
          </View>
        )}
      />

      <View style={styles.inputBar}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Nhắn tin..."
          placeholderTextColor="#8C8581"
          style={styles.input}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={onSend}>
          {sending ? <ActivityIndicator color="#181210" size="small" /> : <Ionicons name="send" size={18} color="#181210" />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0908',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#241E1B',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    backgroundColor: '#4A3E39',
  },
  userHeaderText: {
    flex: 1,
  },
  userName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  userSub: {
    color: '#A39C99',
    fontSize: 12,
    marginTop: 2,
  },
  messageList: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 10,
    paddingBottom: 20,
  },
  stateWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  stateText: {
    color: '#A39C99',
    marginTop: 8,
  },
  errorText: {
    color: '#ff7b7b',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  messageRow: {
    maxWidth: '82%',
  },
  mineRow: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  theirRow: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  mineBubble: {
    backgroundColor: '#FFD14A',
  },
  theirBubble: {
    backgroundColor: '#24201E',
  },
  messageText: {
    color: '#111',
    fontSize: 14,
    lineHeight: 20,
  },
  timeText: {
    color: '#8C8581',
    fontSize: 11,
    marginTop: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#241E1B',
    backgroundColor: '#13100E',
  },
  input: {
    flex: 1,
    backgroundColor: '#231E1C',
    borderRadius: 16,
    color: '#FFF',
    fontSize: 14,
    maxHeight: 110,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 10,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD14A',
  },
});
