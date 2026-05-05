import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Image, Alert, ActionSheetIOS } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { getComments, addComment, updateComment, deleteComment, CommentDocument, CommentCursor } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { safeImageUri } from '../utils/imageSource';

type Props = {
  postId: string | null;
  visible: boolean;
  onClose: () => void;
  onCommentCountChange?: (postId: string, delta: number) => void;
};

export default function CommentModal({ postId, visible, onClose, onCommentCountChange }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [inputText, setInputText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState<CommentDocument | null>(null);
  
  const cursorRef = useRef<CommentCursor>(null);
  const hasMoreRef = useRef(true);

  const fetchComments = useCallback(async (isRefresh = false) => {
    if (!postId) return;
    
    if (isRefresh) {
      setLoading(true);
      cursorRef.current = null;
      hasMoreRef.current = true;
    } else {
      if (loadingMore || !hasMoreRef.current) return;
      setLoadingMore(true);
    }

    try {
      const result = await getComments(postId, { cursor: cursorRef.current });
      if (isRefresh) {
        setComments(result.items);
      } else {
        setComments(prev => [...prev, ...result.items]);
      }
      cursorRef.current = result.nextCursor;
      hasMoreRef.current = Boolean(result.nextCursor);
      setError('');
    } catch (e) {
      setError('Lỗi tải bình luận');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [postId, loadingMore]);

  useEffect(() => {
    if (visible && postId) {
      void fetchComments(true);
    } else {
      setComments([]);
      setInputText('');
      setEditingComment(null);
    }
  }, [visible, postId, fetchComments]);

  const handleSubmit = async () => {
    if (!postId || !inputText.trim() || submitting) return;
    setSubmitting(true);
    try {
      if (editingComment) {
        await updateComment(postId, editingComment.id, inputText);
        setComments(prev => prev.map(c => c.id === editingComment.id ? { ...c, text: inputText.trim() } : c));
        setEditingComment(null);
      } else {
        const newComment = await addComment(postId, inputText);
        setComments(prev => [newComment, ...prev]);
        if (onCommentCountChange) {
          onCommentCountChange(postId, 1);
        }
      }
      setInputText('');
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể gửi bình luận');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentLongPress = (comment: CommentDocument) => {
    if (comment.author_id !== user?.uid) return;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Hủy', 'Chỉnh sửa', 'Xóa'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            startEditing(comment);
          } else if (buttonIndex === 2) {
            confirmDelete(comment);
          }
        }
      );
    } else {
      Alert.alert(
        'Tùy chọn',
        '',
        [
          { text: 'Chỉnh sửa', onPress: () => startEditing(comment) },
          { text: 'Xóa', onPress: () => confirmDelete(comment), style: 'destructive' },
          { text: 'Hủy', style: 'cancel' }
        ]
      );
    }
  };

  const startEditing = (comment: CommentDocument) => {
    setEditingComment(comment);
    setInputText(comment.text);
  };

  const confirmDelete = (comment: CommentDocument) => {
    Alert.alert('Xóa bình luận', 'Bạn có chắc muốn xóa bình luận này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => performDelete(comment) }
    ]);
  };

  const performDelete = async (comment: CommentDocument) => {
    if (!postId) return;
    try {
      await deleteComment(postId, comment.id);
      setComments(prev => prev.filter(c => c.id !== comment.id));
      if (onCommentCountChange) {
        onCommentCountChange(postId, -1);
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể xóa bình luận');
    }
  };

  const formatTimeAgo = (value: any): string => {
    const millis = typeof value?.toMillis === 'function'
      ? value.toMillis()
      : typeof value?.seconds === 'number'
        ? value.seconds * 1000
        : Date.now();
  
    const diffSec = Math.max(1, Math.floor((Date.now() - millis) / 1000));
    if (diffSec < 60) return `${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}p`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}g`;
    return `${Math.floor(diffHour / 24)}n`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Bình luận</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {loading && comments.length === 0 ? (
            <ActivityIndicator style={{ flex: 1 }} color="#FFD400" />
          ) : error ? (
            <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
          ) : comments.length === 0 ? (
            <View style={styles.center}><Text style={styles.emptyText}>Chưa có bình luận nào</Text></View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={c => c.id}
              inverted
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onLongPress={() => handleCommentLongPress(item)}
                  delayLongPress={500}
                  activeOpacity={0.8}
                >
                  <View style={styles.commentItem}>
                    <Image source={{ uri: safeImageUri(item.author_avatar) }} style={styles.avatar} />
                    <View style={styles.commentBody}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.username}>{item.author_username}</Text>
                        <Text style={styles.time}>{formatTimeAgo(item.created_at)}</Text>
                      </View>
                      <Text style={styles.commentText}>{item.text}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              onEndReached={() => { void fetchComments(false); }}
              onEndReachedThreshold={0.5}
            />
          )}

          {editingComment && (
            <View style={styles.editBanner}>
              <Text style={styles.editBannerText}>Đang chỉnh sửa bình luận...</Text>
              <TouchableOpacity onPress={() => { setEditingComment(null); setInputText(''); }}>
                <Ionicons name="close-circle" size={20} color="#bbb" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputSection}>
            <TextInput
              style={styles.input}
              placeholder="Viết bình luận..."
              placeholderTextColor="#888"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]} 
              onPress={handleSubmit}
              disabled={!inputText.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Ionicons name="send" size={18} color={inputText.trim() ? '#000' : '#888'} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1a1513',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '75%',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    position: 'relative',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: { color: '#ff7b7b' },
  emptyText: { color: '#888' },
  listContent: {
    padding: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    marginRight: 10,
  },
  commentBody: {
    flex: 1,
    backgroundColor: '#2a2422',
    padding: 10,
    borderRadius: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  username: {
    color: '#FFD400',
    fontWeight: 'bold',
    fontSize: 14,
  },
  time: {
    color: '#888',
    fontSize: 12,
  },
  commentText: {
    color: '#ddd',
    fontSize: 14,
    lineHeight: 20,
  },
  editBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#332a27',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  editBannerText: {
    color: '#FFD400',
    fontSize: 12,
  },
  inputSection: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'flex-end',
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2422',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 40,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD400',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: {
    backgroundColor: '#444',
  },
});
