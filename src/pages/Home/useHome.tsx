import { ShellContext } from 'contexts/ShellContext'
import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoomNameGenerator, RoomNameType } from 'lib/RoomNameGenerator'

const roomTypePrefixes = ['public', 'private']
const roomTypePrefixesDelimitedForRegExp = roomTypePrefixes.join('|')
const rRoomNameAppPrefix = `^${window.location.origin}/(${roomTypePrefixesDelimitedForRegExp})/`

export const useHome = () => {
  const { setTitle } = useContext(ShellContext)
  const [roomNameType, setRoomNameType] = useState<RoomNameType>(
    RoomNameType.UUID
  )
  const [roomName, setRoomName] = useState(() =>
    RoomNameGenerator.generate(roomNameType)
  )
  const [showEmbedCode, setShowEmbedCode] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setTitle('Chitchatter')
  }, [setTitle])

  const handleRoomNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    const baseRoomName = value.replace(new RegExp(rRoomNameAppPrefix), '')
    setRoomName(baseRoomName)
  }

  const handleRoomNameTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newType: RoomNameType | null
  ) => {
    if (newType !== null) {
      setRoomNameType(newType)
      setRoomName(RoomNameGenerator.generate(newType))
    }
  }

  const regenerateRoomName = () => {
    setRoomName(RoomNameGenerator.generate(roomNameType))
  }

  const handleFormSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
  }

  const handleJoinPublicRoomClick = () => {
    navigate(`/public/${roomName}`)
  }

  const handleJoinPrivateRoomClick = () => {
    navigate(`/private/${roomName}`)
  }

  const handleGetEmbedCodeClick = () => {
    setShowEmbedCode(true)
  }

  const handleEmbedCodeWindowClose = () => {
    setShowEmbedCode(false)
  }

  const isRoomNameValid = roomName.length > 0

  return {
    roomName,
    roomNameType,
    setRoomName,
    showEmbedCode,
    handleRoomNameChange,
    handleRoomNameTypeChange,
    regenerateRoomName,
    handleFormSubmit,
    handleJoinPublicRoomClick,
    handleJoinPrivateRoomClick,
    handleGetEmbedCodeClick,
    handleEmbedCodeWindowClose,
    isRoomNameValid,
  }
}
