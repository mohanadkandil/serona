import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Modal, TextInput } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import {
  getAllSessionReports,
  getSessionReport,
  deleteSessionReport,
  updateSessionReport,
  SessionReport,
} from '../services/database';

export default function PastReports({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [sessions, setSessions] = useState<SessionReport[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSession, setEditedSession] = useState<SessionReport | null>(null);

  useEffect(() => {
    if (visible) {
      loadSessions();
    }
  }, [visible]);

  const loadSessions = async () => {
    setLoading(true);
    const allSessions = await getAllSessionReports();
    setSessions(allSessions);
    setLoading(false);
  };

  const handleSessionPress = async (id: number) => {
    const session = await getSessionReport(id);
    setSelectedSession(session);
  };

  const handleDelete = async (id: number) => {
    await deleteSessionReport(id);
    await loadSessions();
    setSelectedSession(null);
  };

  const handleEdit = () => {
    setEditedSession({ ...selectedSession! });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedSession(null);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!editedSession || !editedSession.id) return;

    try {
      await updateSessionReport(editedSession.id, editedSession);
      await loadSessions();
      const updated = await getSessionReport(editedSession.id);
      setSelectedSession(updated);
      setIsEditing(false);
      setEditedSession(null);
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pb-4 pt-12">
          <Text className="text-2xl font-semibold text-gray-900">Past Reports</Text>
          <TouchableOpacity onPress={onClose} className="rounded-full bg-gray-100 p-2">
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#9333EA" />
          </View>
        ) : sessions.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <MaterialCommunityIcons name="clipboard-text-off-outline" size={64} color="#D1D5DB" />
            <Text className="mt-4 text-lg text-gray-500">No past reports yet</Text>
            <Text className="mt-2 text-center text-sm text-gray-400">
              Complete a session analysis to see it here
            </Text>
          </View>
        ) : selectedSession ? (
          // Session Detail View
          <ScrollView className="flex-1">
            <View className="p-6">
              {/* Back Button */}
              <TouchableOpacity
                onPress={() => setSelectedSession(null)}
                className="mb-4 flex-row items-center">
                <Ionicons name="arrow-back" size={24} color="#9333EA" />
                <Text className="ml-2 text-base font-medium text-purple-600">Back to list</Text>
              </TouchableOpacity>

              {/* Session Header */}
              <View className="mb-6 rounded-2xl border border-purple-100 bg-purple-50 p-4">
                <Text className="text-sm font-medium text-purple-700">
                  {formatDate(selectedSession.createdAt)}
                </Text>
                {selectedSession.chiefComplaint && (
                  <Text className="mt-2 text-lg font-semibold text-gray-900">
                    {selectedSession.chiefComplaint}
                  </Text>
                )}
                {selectedSession.classification && (
                  <View className="mt-2 flex-row items-center">
                    <View className="rounded-full bg-purple-200 px-3 py-1">
                      <Text className="text-xs font-medium text-purple-800">
                        {selectedSession.classification}
                      </Text>
                    </View>
                    {selectedSession.severity && (
                      <View className="ml-2 rounded-full bg-orange-200 px-3 py-1">
                        <Text className="text-xs font-medium text-orange-800">
                          {selectedSession.severity}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Chief Complaint */}
              <View className="mb-6">
                <Text className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Chief Complaint
                </Text>
                {isEditing ? (
                  <TextInput
                    value={editedSession?.chiefComplaint || ''}
                    onChangeText={(text) =>
                      setEditedSession((prev) => ({ ...prev!, chiefComplaint: text }))
                    }
                    multiline
                    className="rounded-xl border border-purple-300 bg-white p-4 text-sm text-gray-900"
                    style={{ minHeight: 60 }}
                  />
                ) : (
                  <View className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <Text className="text-sm leading-6 text-gray-700">
                      {selectedSession.chiefComplaint || 'N/A'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Transcript */}
              {selectedSession.transcript && (
                <View className="mb-6">
                  <Text className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Transcript
                  </Text>
                  {isEditing ? (
                    <TextInput
                      value={editedSession?.transcript || ''}
                      onChangeText={(text) =>
                        setEditedSession((prev) => ({ ...prev!, transcript: text }))
                      }
                      multiline
                      className="rounded-xl border border-gray-300 bg-white p-4 text-sm text-gray-900"
                      style={{ minHeight: 120 }}
                    />
                  ) : (
                    <View className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <Text className="text-sm leading-6 text-gray-700">
                        {selectedSession.transcript}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Medical Analysis */}
              {selectedSession.medicalAnalysis && (
                <View className="mb-6">
                  <Text className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Medical Analysis
                  </Text>
                  {isEditing ? (
                    <TextInput
                      value={editedSession?.medicalAnalysis || ''}
                      onChangeText={(text) =>
                        setEditedSession((prev) => ({ ...prev!, medicalAnalysis: text }))
                      }
                      multiline
                      className="rounded-xl border border-blue-300 bg-white p-4 text-sm text-gray-900"
                      style={{ minHeight: 120 }}
                    />
                  ) : (
                    <View className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                      <Text className="text-sm leading-6 text-gray-700">
                        {selectedSession.medicalAnalysis}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Patient Insights */}
              {selectedSession.patientInsights && (
                <View className="mb-6">
                  <Text className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Patient Insights
                  </Text>
                  {isEditing ? (
                    <TextInput
                      value={editedSession?.patientInsights || ''}
                      onChangeText={(text) =>
                        setEditedSession((prev) => ({ ...prev!, patientInsights: text }))
                      }
                      multiline
                      className="rounded-xl border border-green-300 bg-white p-4 text-sm text-gray-900"
                      style={{ minHeight: 120 }}
                    />
                  ) : (
                    <View className="rounded-xl border border-green-200 bg-green-50 p-4">
                      <Text className="text-sm leading-6 text-gray-700">
                        {selectedSession.patientInsights}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Action Buttons */}
              {isEditing ? (
                <View className="flex-row">
                  <TouchableOpacity
                    onPress={handleCancelEdit}
                    className="mr-2 flex-1 rounded-xl border border-gray-300 bg-white px-6 py-4">
                    <Text className="text-center text-base font-semibold text-gray-700">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveEdit}
                    className="ml-2 flex-1 rounded-xl bg-purple-600 px-6 py-4">
                    <Text className="text-center text-base font-semibold text-white">
                      Save Changes
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="flex-row">
                  <TouchableOpacity
                    onPress={handleEdit}
                    className="mr-2 flex-1 rounded-xl bg-purple-600 px-6 py-4">
                    <Text className="text-center text-base font-semibold text-white">
                      Edit Report
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => selectedSession.id && handleDelete(selectedSession.id)}
                    className="ml-2 flex-1 rounded-xl bg-red-500 px-6 py-4">
                    <Text className="text-center text-base font-semibold text-white">
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        ) : (
          // Sessions List View
          <ScrollView className="flex-1 px-6 pt-4">
            {sessions.map((session) => (
              <TouchableOpacity
                key={session.id}
                onPress={() => session.id && handleSessionPress(session.id)}
                className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-500">
                      {formatDate(session.createdAt)}
                    </Text>
                    {session.chiefComplaint && (
                      <Text className="mt-1 text-base font-semibold text-gray-900">
                        {session.chiefComplaint}
                      </Text>
                    )}
                    {session.classification && (
                      <View className="mt-2 flex-row items-center">
                        <View className="rounded-full bg-purple-100 px-3 py-1">
                          <Text className="text-xs font-medium text-purple-700">
                            {session.classification}
                          </Text>
                        </View>
                        {session.severity && (
                          <View className="ml-2 rounded-full bg-orange-100 px-3 py-1">
                            <Text className="text-xs font-medium text-orange-700">
                              {session.severity}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                    <Text className="mt-2 text-sm text-gray-600" numberOfLines={2}>
                      {session.transcript}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
